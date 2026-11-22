# CesiumJS 1.x clamping and draping: port spec

Reference for porting height-referenced content (points, billboards, models,
entity geometry) and draped content (ground primitives, classification,
vector tiles). Derived from the 1.x source in this repository. Paths are
relative to `packages/engine/Source` (`Scene/` unless noted); `core/` is
`packages/core/Source`. Sections 1-5 are what 1.x does; 6 is suggestions.

## 1. HeightReference (HeightReference.js:8-57)

| Value                                  | #     | Surfaces         | Height                  |
| -------------------------------------- | ----- | ---------------- | ----------------------- |
| NONE                                   | 0     | none             | absolute                |
| CLAMP_TO_GROUND / RELATIVE_TO_GROUND   | 1 / 2 | globe + 3D Tiles | surface / surface + own |
| CLAMP_TO_TERRAIN / RELATIVE_TO_TERRAIN | 3 / 4 | globe only       | surface / surface + own |
| CLAMP_TO_3D_TILE / RELATIVE_TO_3D_TILE | 5 / 6 | 3D Tiles only    | surface / surface + own |

- `isHeightReferenceClamp` = {1,3,5}, `isHeightReferenceRelative` = {2,4,6}
  (:69-89). Filtering: `ignore3dTiles` for 3/4, `ignoreTerrain` for 5/6
  (Scene.js:4257-4263, :4335-4341).
- "Ground" = **max** over candidate surfaces (Scene.js:4269-4292). A tileset
  counts only if `show && enableCollision` (:4231-4235; default false,
  Cesium3DTileset.js:961); the globe only if `globe.show` (:4283).

## 2. Point and model clamping

### 2.1 Synchronous height: Scene.getHeight (Scene.js:4252-4295)

```text
max = -inf
if !ignore3dTiles: max = maxOverTilesets(primitives)   // recurses collections, :4214-4244
if !ignoreTerrain && globe.show: max = max(max, globe.getHeight(carto))
return max > -inf ? max : undefined
```

**Globe.getHeight (Globe.js:853-976).** Descend from the level-0 tile
containing the point (SW, SE, NW, else NE; :882-896), keeping the deepest
tile with `data.renderedMesh` (real mesh once its vertexArray exists, else
the fill mesh; GlobeSurfaceTile.js:144-151). LOD = deepest _loaded_ tile
on the path, rendered or culled (:900-904). Ray: `dir =
geodeticSurfaceNormal(P0)` (P0 at height 0), `origin =
getSurfaceNormalIntersectionWithZAxis(P0, 11500.0)` (core/Ellipsoid.js:628-664,
undefined when `|z| >= radii.z - 11500`), fallback `P0 - n·(|min(tileMin,
-11500)| + 1)` (:940-957). Pick in SCENE3D with `cullBackFaces = false`
(:959-967); height = `cartesianToCartographic(hit).height`.
TerrainMesh.pick → TerrainPicker (Core/TerrainMesh.js:339-350,
Core/TerrainPicker.js:100-133): tile-local quadtree, max level 3 (:26),
built lazily on a worker (:575-611), all indices incl. skirts (:232),
exaggerated vertices (:535); nearest hit to the origin.

**Cesium3DTileset.getHeight (Cesium3DTileset.js:4290-4325).** Geocentric
ray: `P = cartographicToCartesian(carto)` (includes `carto.height`), `dir =
-P` unnormalized (:4309 overwrites :4308), `origin = 2·maxRadius·P`
(|origin| ≈ 8e13 m, float64 ulp ≈ 1.6 cm). `pick` (:4385-4436) tests only
`_selectedTiles` (main-camera LOD), sorts by bounding-sphere distance to the
origin and returns the **first tile with any hit**, not the nearest hit;
WebGL1 needs `enablePick` (:4386). Per tile: Model3DTileContent.pick
(Model/Model3DTileContent.js:468-485) → pickModel (Model/pickModel.js:60-222):
CPU ray/triangle over all primitives and instances, positions/indices read
back from GPU when no typed array (Model/ModelReader.js:150-185),
exaggeration per vertex (:164-186), `backFaceCulling ?? true` (:193), min
t ≥ 0; point clouds skipped (:110-113).

### 2.2 Keeping heights current: Scene.updateHeight (Scene.js:4309-4402)

The wrapper (:4319-4333) uses the passed height if any, else re-runs
`getHeight(carto, heightReference)`. Terrain: `globe._surface.updateHeight`
(:4344-4349; no `globe.show` check). Tilesets: `primitive.updateHeight` for
**top-level** tilesets only (:4369-4375; getHeight recurses, this does not),
plus primitiveAdded/Removed listeners (:4377-4389).

**QuadtreePrimitive.updateHeight (QuadtreePrimitive.js:277-303)** queues
`{positionCartographic, level: -1, callback}`; selection routes it to the
level-0 tile (:551-574) and `updateCustomData` pushes it one level per visit
(QuadtreeTile.js:279-306, called at QuadtreePrimitive.js:729). Tiles join
`_tileToUpdateHeights` when newly RENDERED (:809-812, :864-867, :960-963)
or newly CULLED_BUT_NEEDED (tile under the camera, :1226-1238); rolled back
with the render list (:880, :929). `updateHeights` (:1395-1579) runs in
`endFrame` after the load queue, render pass only, not morphing (:438-450):

```text
budget = 2.0 ms (_updateHeightsTimeSlice, :97)
while queue: tile = queue[0]
  if !tile.data.mesh: requeue next frame if still RENDERED/CULLED_BUT_NEEDED; shift; continue
  for data in tile.customData (iterator resumes next frame on timeout, :1434-1437, :1568-1570):
    if tile.level > data.level && !terrainData.wasCreatedByUpsampling():
      carto = per-tile LRU cache (1000, QuadtreeTile.js:65; key lon/lat hash + maxSSE)
           ?? pick(ray as Globe.getHeight; 2D/CV: from height -11500 along +X)
      if carto: data.callback(carto); data.level = tile.level
```

Heights only refine: `data.level` never drops except on
`invalidateAllTiles` (reset to 0, :208-231), so zoom-out keeps the finer
height; upsampled tiles never fire.

**Cesium3DTileset.updateHeight (Cesium3DTileset.js:4339-4370)**:
`processUpdateHeight` (:3262-3311) runs per selected tile in `updateTiles`
(:3580); requires `enableCollision && show`; fires for tiles **not selected
last frame** whose bounding sphere contains the point (lifted to the sphere
center's height); deferred to `frameState.afterRender`, called with **no
argument**, so the Scene wrapper re-runs the full max query.

### 2.3 Consumers

**Model (Model/Model.js:2553-2614, :2884-2905).** `updateClamping` runs on
matrix change, `_heightDirty` (also set by `terrainProviderChanged`,
:383-388), or **every frame if `minimumPixelSize != 0`** (:2554-2559);
`_heightChanged` is not found. It reinstalls the callback and calls
`scene.getHeight` synchronously, for the cartographic of the matrix
translation (:2583-2587). The callback copies `modelMatrix` to
`_clampedModelMatrix` and replaces **only the translation** with
`cartographicToCartesian(lon, lat, h [+ own height if relative])`: no
re-orientation to the normal; the offset is along the geodetic normal
implicitly. It sets `_heightDirty`, so the next frame re-queries the max.
Used for bounds and draw (:1214, :2621).

**Billboard / Label (Billboard.js:1127-1198).** Same install + immediate
getHeight; the callback writes `_clampedPosition` (:1172-1183) with no
re-query, so a terrain callback can drop a CLAMP_TO_GROUND billboard off a
tileset roof until a tileset callback fires. Re-clamped on mode change
(:1374-1377); Label forwards to glyph billboards (Label.js:347-364).
PointPrimitive has no heightReference; PointVisualizer swaps clamped points
to billboards (DataSources/PointVisualizer.js:121-139).
Depth: clamped billboards (BillboardCollection.js:1257-1268) test
`czm_globeDepthTexture` (globe + tile depth) at three key points with
depthsilon 10.0 within `minimumRadius/1000` (≈6356.75 m) and collapse the
vertex only if all are occluded (Shaders/BillboardCollectionVS.glsl:89-113,
:304-333); beyond, a per-fragment test within `minimumRadius/10`
(≈635675.23 m) (BillboardCollection.js:305-309; BillboardCollectionFS.glsl:83-106).

**Entity geometry (DataSources/).** No height/extrudedHeight + fill →
GroundPrimitive (GroundGeometryUpdater.js:69-76). Otherwise built at height
0 when clamped (:159-175) and shifted by `TerrainOffsetProperty` =
`geodeticNormal(center)·terrainHeight` (TerrainOffsetProperty.js:115-219):
one sample at the center moves the shape rigidly. Applied in the VS as
batch-table `offset` × per-vertex `applyOffset` (Primitive.js:910-935);
TOP/ALL from `computeGeometryOffsetAttribute` (GroundGeometryUpdater.js:208-235),
which treats only RELATIVE_TO_GROUND as a relative extruded reference (:224).

## 3. sampleHeight / clampToHeight / *MostDetailed (Picking.js)

- Requires depth textures (Scene.js:923-941) and 3D mode.
- Ray (:1409-1427): from the surface point raised along the geodetic normal
  to `_defaultMaxTerrainHeight = 9000.0` (Core/ApproximateTerrainHeights.js:238),
  direction −normal; clampToHeight uses only the input's lon/lat
  (:1436-1444). Content above 9000 m is behind the origin and missed.
- getRayIntersection (:1115-1199): offscreen View, orthographic camera on
  the ray (`width` default 0.1 m, near 0.1; :31, :54-66, :986-1003), 1×1
  viewport, a full `updateAndExecuteCommands` with `passes.pick` +
  `offscreen`; read one pick color, then per frustum the pick depth, first
  `0 < d < 1`, `distance = near + d·(far − near)` (:1165-1185).
- Included: globe = last frame's main-view tile commands
  (QuadtreePrimitive.js:374-376, GlobeSurfaceTileProvider.js:638-653), so
  terrain is at main-camera LOD and missing where the main view drew
  nothing; tilesets traverse with the ray camera, PICK pass, no requests
  (Cesium3DTilePass.js:28-33); every other primitive draws too.
- `objectsToExclude` (:1100-1113, :829-943): drill pick: hide the hit
  (instance `show`, `Cesium3DTileFeature.show`, else the whole primitive)
  and re-render the whole pass until a non-excluded or position-only (globe)
  hit. Cost: one full offscreen render per excluded layer per position.
- MostDetailed (:1456-1527, :1596-1695): per position, each frame
  (Scene.js:4691) a `MOST_DETAILED_PRELOAD` traversal (requests, no
  commands) of non-excluded tilesets until all ready, then one
  `MOST_DETAILED_PICK` render; resolved after the next postRender
  (:1251-1267). Terrain is not refined. No tilesets → immediate (:1089-1091).
- pickPosition (:693-800) reads the main view's pick depth at a pixel,
  cached per pixel until the next frame (:70, :711-718).

## 4. Draping: shadow volumes and classification

### 4.1 Pass order, stencil, ClassificationType

Per frustum (Scene.js:2870-3098): clear depth/stencil → GLOBE → copy globe
depth to `czm_globeDepthTexture` (:2889-2891) → TERRAIN_CLASSIFICATION
(:2893-2907) → clear depth if `!depthTestAgainstTerrain` (:2909-2914) →
CESIUM_3D_TILE → merge tile depth into `czm_globeDepthTexture`
(:2983-2990) → CESIUM_3D_TILE_CLASSIFICATION (:2992-2998) → clear stencil
(:3077-3079) → OPAQUE → TRANSLUCENT → translucent-tile classification
(:3098). Pass ids: Renderer/Pass.js:17-32.

Stencil (StencilConstants.js:12-15): `CESIUM_3D_TILE_MASK 0x80`,
`SKIP_LOD_MASK 0x70`, `CLASSIFICATION_MASK 0x0f`. Tile content writes 0x80
on z-pass (`setCesium3DTileBit` :18-36; Model/TilesetPipelineStage.js:65-69;
Cesium3DTileBatchTable.js:1049-1050); the globe writes none. Globe vs tiles
is decided by **pass timing** (terrain classification sees only globe depth)
plus the **0x80 test** in the tiles pass.

ClassificationType (ClassificationType.js:13-27): TERRAIN 0,
CESIUM_3D_TILE 1, BOTH 2 (default). TERRAIN queues only the
TERRAIN_CLASSIFICATION commands, CESIUM_3D_TILE only their
`derivedCommands.tileset` copies, BOTH both (GroundPrimitive.js:563-604).

### 4.2 Volumes (GroundPrimitive.js, ApproximateTerrainHeights)

- `ApproximateTerrainHeights.initialize()` loads per-tile [min,max] to
  level 6 (Core/ApproximateTerrainHeights.js:42-53, :237-239).
  `getMinimumMaximumHeights(rect)` (:63-129): deepest geographic tile ≤ 6
  holding all four corners (:171-235), defaults −100000 / 9000, min lowered
  by the chord sag at the rectangle center, min ≥ −100000.
- One min/max for the union rectangle of all instances, exaggerated once at
  creation (:755-769). `createShadowVolume` rebuilds each geometry as a
  POSITION_ONLY extruded volume (core/PolygonGeometry.js:1507-1530): bottom
  `_minHeight`, top `_maxHeight + r/cos(granularity/2) − r` (:364-376).
- VS pushes bottom vertices along `extrudeDirection` by
  `min(55000.0, czm_geometricToleranceOverMeter·|pos|)` in 3D
  (Shaders/ShadowVolumeAppearanceVS.glsl:30-38; GroundPrimitive.js:22-26);
  `czm_depthClamp`/`czm_writeDepthClamp` stop near/far clipping (:100,
  Shaders/ShadowVolumeFS.glsl:12). Per-instance bounding spheres from
  ApproximateTerrainHeights (:735-743).

### 4.3 Stencil and color passes (ClassificationPrimitive.js)

Two commands per vertex array, each with a tileset copy (:647-736):

1. Stencil-depth, z-fail (:334-369): no color writes, no culling, depth
   test `LESS_OR_EQUAL`, no depth writes, write mask 0x0f; front zFail
   DECREMENT_WRAP, back zFail INCREMENT_WRAP, else KEEP. Function ALWAYS
   (terrain) or EQUAL ref 0x80 mask 0x80 (tiles). Nonzero low bits where the
   surface is inside the volume; robust to the camera being inside.
2. Color (:371-397): stencil NOT_EQUAL 0 (mask 0x0f), all ops ZERO (one
   shade per pixel per volume, stencil reset), no depth test,
   premultiplied-alpha blend.

Pick uses the same states (:399-422). Invert classification adds
stencil-only `_commandsIgnoreShow` (:738-753; Scene.js:3000-3075).
`isSupported` = stencil buffer (:330-332).

### 4.4 Color shading (Shaders/ShadowVolumeAppearanceFS.glsl)

- Surface position from `czm_globeDepthTexture` (:42-50); normals from
  neighbor depths (:18-37, :84-89).
- uv: planar extents (VS :66-86) if every instance rectangle is ≤ 1°
  (`MAX_WIDTH_FOR_PLANAR_EXTENTS`, ShadowVolumeAppearance.js:907-937), else
  spherical (FS :54-60); remapped by rotation points (:131-137).
- `CULL_FRAGMENTS`: discard outside uv (0,1) or depth 0 (:68-75). This lets
  differently colored instances share a batch; without depth textures
  (GroundPrimitive.js:984-986) all instances must share one color
  (ClassificationPrimitive.js:1104-1114).
- Per-instance color from the batch table (VS :96-98), gamma-corrected and
  premultiplied (FS :92-109); materials get `st` from uv.

### 4.5 GroundPolylinePrimitive

- Per-segment volumes, min/max from ApproximateTerrainHeights over the
  segment rectangle (Core/GroundPolylineGeometry.js:1465-1484; initial walls
  0..1000 m :45-46; miter breaks 30°/150° :32-33); VS widens to ~2× pixel
  width (Shaders/PolylineShadowVolumeVS.glsl:122-160).
- One pass (GroundPolylinePrimitive.js:461-486, :523-533): back-face cull on
  inverted geometry, no depth test or writes, premultiplied blend; stencil
  EQUAL 0x80 only on the tiles copy.
- FS (Shaders/PolylineShadowVolumeFS.glsl:11-86): reconstruct from depth;
  discard sky, |right-plane distance| > `halfWidth·metersPerPixel`, or behind
  the start/end miter planes; s along, t across.

### 4.6 Vector tiles and classification tilesets

- Vector3DTilePolygons: volumes from the tile region min/max
  (Vector3DTileContent.js:481-482) or per-polygon `POLYGON_MINIMUM/MAXIMUM_HEIGHTS`
  (:565-591); Vector3DTilePrimitive repeats 4.3's states and passes
  (Vector3DTilePrimitive.js:361-460, :796-829, :1138-1157) with
  ShadowVolumeFS/VectorTileVS, re-batching by color (:536-706).
- Polylines are Vector3DTileClampedPolylines when the tileset has a
  `classificationType` (Vector3DTileContent.js:665-668): ApproximateTerrainHeights
  bounds (Vector3DTileClampedPolylines.js:161-175), one pass as 4.5
  (:504-513, :590-599). Points become billboards/labels with the tileset's
  `heightReference` (Vector3DTilePoints.js:186-202), i.e. section 2.
- glTF classification tilesets: the mesh is the volume;
  Model/ClassificationModelDrawCommand.js:60-61, :77-160, :199-245 build the
  same two-step commands in the same two passes.
- This repository also has Core/VectorProvider.js: clamped
  `BufferPolyline/PolygonCollection`s baked into per-tile lookup textures
  (:78-86, :223-244, :392-400; marked per frame, Scene.js:3674-3713;
  CLAMP_TO_GROUND targets both surfaces, :633-638), sampled by
  Model/ModelVectorLookupPipelineStage.js. Texture-space, not volumes.

## 5. Terrain height queries and defects

- `sampleTerrain` (Core/sampleTerrain.js:45-290): group by tile at `level`,
  `requestTileGeometry` (100 ms retry when throttled, :110-148),
  `interpolateHeight` on fresh data; if any position is undefined,
  `createMesh({throttle:false})` and retry all (:226-278). No exaggeration
  (:257). Failed tiles → `height = undefined` (:280-288).
- `sampleTerrainMostDetailed` (Core/sampleTerrainMostDetailed.js:35-129):
  per-position max available level, sample per level, recurse where the
  level grew after availability loaded; requires availability (:58-62).
- QuantizedMesh without mesh (Core/QuantizedMeshTerrainData.js:637-688):
  u, v = tile fraction × 32767, barycentric over quantized triangles, lerp
  min..max by `h/32767`. Heightmap buffer path
  (Core/HeightmapTerrainData.js:677-849): per-triangle, split SW–NE.

**Confirmed broken: QuantizedMeshTerrainData mesh path.** `interpolateHeight`
scales u, v to 0..32767 (:549-560); with `_mesh` it calls
`interpolateMeshHeight` (:562-566), which compares them with
`decodeTextureCoordinates` (:592-608) = 0..1 (Core/TerrainEncoding.js:473-497;
written as `rawU/32767`, Workers/createVerticesFromQuantizedTerrainMesh.js:116-135).
The box test (:569-575) fails except within 1/32767 of the west/south
edges → undefined. The quantized arrays are freed by `createMesh`
(:367-378). Only caller: sampleTerrain. If one position misses every
quantized triangle, the loop breaks (:245-248), the mesh is built, the
retry fails for all remaining positions, and they **keep their input
height** (no write on failure, :216-221) instead of becoming undefined.

Other hazards:

- HeightmapTerrainData mesh path returns `(h − heightOffset)/heightScale`
  (:799-813); only the buffer path is rescaled (:474). Wrong after
  `createMesh` when scale ≠ 1 or offset ≠ 0 (latent; reached for LERC).
- Model.pick (Model/Model.js:3052-3066) passes 5 args to pickModel's 7
  (Model/pickModel.js:60-68): `result` lands in `ellipsoid`;
  Model3DTileContent's extra `Ellipsoid.WGS84` makes it work by accident.
- updateHeights checks `tile.data.mesh` (QuadtreePrimitive.js:1415) but
  picks `renderedMesh`, the fill mesh until the vertexArray exists
  (GlobeSurfaceTile.js:1024 vs :1051): a TRANSFORMED tile could report a fill
  height and advance `data.level` (possible; not verified at runtime).
- Terrain callbacks pass terrain-only heights (Scene.js:4323-4325), losing
  the max with tilesets (billboards stay wrong; models self-correct).
- Tileset heights: geocentric ray, first-tile-wins, main-view LOD only.

## 6. Design notes for a GPU-driven engine (suggestions, not 1.x)

- _Suggestion:_ draping as a deferred decal pass after opaque globe and
  tiles: rasterize each drape's footprint bounds, reconstruct position from
  depth, test the footprint analytically (point-in-polygon/SDF; polyline
  planes as 4.5). ClassificationType becomes a test on a surface-class /
  feature-id target (globe = 0, tile = id) instead of pass timing + 0x80.
  The 4.4/4.5 shader math ports directly; stencil z-fail and
  ApproximateTerrainHeights volumes are not needed when footprints are
  bounded in screen space.
- _Suggestion:_ for static vectors, baked per-tile footprint textures (as
  in 4.6's VectorProvider) avoid per-frame volume rasterization.
- _Suggestion:_ clamping: keep CPU queries against CPU tile meshes for API
  parity (deepest loaded tile, max over surfaces, exaggerated), but use a
  geodetic ray and the nearest hit for tiles. For many points, a GPU height
  query (compute pass sampling a height/depth target or ray-casting tile
  meshes, writing a buffer read by billboard/model vertex shaders) avoids
  readback; tile load/unload events mark affected points dirty instead of
  1.x's per-tile callback walk with a 2 ms budget.
- _Suggestion:_ sampleHeight replacement: one top-down depth render (or the
  main depth target) answers many positions per pass, not one offscreen
  render per position and per excluded object.
- _Suggestion:_ do not port the quantized-mesh mesh path (section 5);
  interpolate in 0..1 uv from the decoded mesh or keep the quantized arrays.
