# CesiumJS 1.x globe tile selection: parity spec

Reference for the globe `Legacy1x` port (plan §15, M3 increment 2). Derived
from the 1.x source in this repository; paths are relative to `packages/`
(`engine/Source/Scene` unless noted; Core math is in `core/Source`).

## 0. Harness: reading 1.x's selection, and "settled"

- The final render list is `globe._surface._tilesToRender`
  (QuadtreePrimitive.js:84), cleared at the start of
  `selectTilesForRendering` (:515). Read it after `scene.render` (e.g. in a
  `scene.postRender` listener) and map entries to (level, x, y).
- Not `_tilesRenderedThisFrame` / `forEachRenderedTile` (:83, :262): that
  Set includes tiles later kicked out of the list.
- Settled: `globe.tilesLoaded === true` (Globe.js:424-434), i.e. the high,
  medium and low load queues are empty after that frame's selection. Then
  every rendered tile is renderable and every tile that meets SSE is DONE,
  no kicking or hysteresis applies, and `trimTiles` doesn't run (it only
  runs with non-empty queues, :1319-1329). Require 2-3 consecutive
  `tilesLoaded` frames.
- Remove history dependence (section 7): a fresh Globe per pose, or
  `globe._surface.invalidateAllTiles()`, then set the camera and render
  until settled.
- Environment: `screenSpaceCameraController.enableCollisionDetection =
false`; `requestRenderMode = false` (frameNumber only advances on rendered
  frames); pin devicePixelRatio, resolutionScale and canvas size; fog is on
  by default for WGS84 (Scene.js:566-567): replicate it or disable it in
  both engines.

## 1. Defaults

- QuadtreePrimitive (:113-155, overwritten each frame from Globe.js:1039-1043):
  maximumScreenSpaceError 2, tileCacheSize 100, loadingDescendantLimit 20,
  preloadAncestors true, preloadSiblings false, `_loadQueueTimeSlice` 5 ms.
- GlobeSurfaceTileProvider: backFaceCulling true (:130),
  cartographicLimitRectangle = Rectangle.MAX_VALUE (:225).
- Fog (Fog.js:18-92): enabled, density 0.0006, heightScalar 0.001,
  heightFalloff 0.59, maxHeight 800000, screenSpaceErrorFactor 2.0.
- Camera: fov 60°, near 1, far 5e8.
- pixelRatio = (useBrowserRecommendedResolution ? 1 : devicePixelRatio) ×
  resolutionScale (default useBrowserRecommendedResolution true);
  drawingBufferHeight = clientHeight × pixelRatio.
- TileSelectionResult: NONE 0, CULLED 1, RENDERED 2, REFINED 3,
  RENDERED_AND_KICKED 6, REFINED_AND_KICKED 7, CULLED_BUT_NEEDED 9;
  originalResult(v) = v & 3, kick(v) = v | 4, wasKicked(v) = v >= 6.
- QuadtreeTileLoadState: START 0, LOADING 1, DONE 2, FAILED 3.

## 2. Screen-space error (QuadtreePrimitive.js:1251-1277)

```text
geomErr(level) = levelZeroErr / (1 << level)
levelZeroErr   = maximumRadius * 2π * 0.25 / (65 * 2)   // ≈ 77067.34 m (CesiumTerrainProvider)
distance       = tile._distance (computeTileVisibility, this frame)
height         = drawingBufferHeight (device pixels)
sseDenominator = 2 * tan(fovy / 2)
error  = geomErr * height / (distance * sseDenominator)
if fog.enabled: error -= fog(distance, fog.density) * fog.sse      // sse = 2.0
error /= pixelRatio                                               // after the fog term
meetsSse = error < maximumScreenSpaceError                        // strict <
```

`fog(d, ρ) = 1 - exp(-(d·ρ)²)` (core Math.js:1122-1125). Fog density per
frame (Fog.js:124-167): disabled above 800 km; otherwise
`density = 0.0006 * 0.001 * pow(max(h/800000, 1e-4), -0.59)`, then
`density *= 1 - |dot(camera.directionWC, normalize(camera.positionWC))|`
(geocentric).

## 3. Visibility and distance (GlobeSurfaceTileProvider.js)

**Bounding region (:1702-1855).** Heights in priority order: own mesh
min/max; own terrainData min/max (upsampled data too); nearest ancestor's
mesh, else terrainData; none. From the mesh, the OBB is
`OBB.fromRectangle(rect, headerMin, headerMax)` (skirts excluded), the
sphere is `mesh.boundingSphere3D`, and the occludee is the header's
horizon-occlusion point (recomputed with a shrunk ellipsoid when min < 0).
Otherwise `OrientedBoundingBox.fromRectangle(rect, min, max)`, its sphere,
and `computeOccludeePoint` (port these exactly).

**computeOccludeePoint (:1645-1694).** Corners (W,S), (E,S), (W,N), (E,N) at
maximumHeight; `computeHorizonCullingPointPossiblyUnderEllipsoid(OBB.center,
corners, minimumHeight)`. EllipsoidalOccluder (core): if `minH < 0` and
`minimumRadius > -minH`, radii' = radii + minH. In scaled space,
`d̂ = normalize(scaled(direction))`; per point `s = scaled(p)`,
`m = max(1, |s|)`, `cosA = dot(ŝ, d̂)`, `sinA = |ŝ × d̂|`, `cosB = 1/m`,
`sinB = sqrt(max(1,|s|²) - 1) · cosB`, `cand = 1 / (cosA·cosB - sinA·sinB)`;
any negative → undefined; result `d̂ · max(cand)`.

**computeDistanceToTile (:1133-1182).** No height source → 9999999999. With
an ancestor's heights, collapse the region to the ancestor height farthest
from the camera for the distance only. TileBoundingRegion.distanceToCamera
(:314-436): edge-plane distances when the camera is outside the rectangle,
plus the height excess, then `max(region, OBB distance)`. Port `computeBox`
(:168-306) verbatim, including its corner adjustment.

**computeTileVisibility (:755-902).**

```text
tile._distance = computeDistanceToTile(...)
if fog.enabled && !underground && fog(distance, density) >= 1.0 -> NONE
if no height source -> PARTIAL
frustum test of the OBB (else sphere): OUTSIDE -> NONE
horizon: visible iff isScaledSpacePointVisiblePossiblyUnderEllipsoid(occludee, region.minimumHeight)
  (no occludee -> visible)
```

Horizon test (EllipsoidalOccluder.js:131-160, 448-471): camera scaled by the
(possibly shrunk) radii; `vh2 = |cv|² - 1`; `vt = occludee - cv`;
`vtDotVc = -dot(vt, cv)`; occluded = `vh2 < 0 ? vtDotVc > 0 : (vtDotVc > vh2
&& vtDotVc²/|vt|² > vh2)`. Level-0 tiles get the occluder only when there
is more than one root (geographic: yes).

## 4. Traversal (QuadtreePrimitive.js)

- Level-zero tiles row-major (y outer; y = 0 is north). Children: SW (2x,
  2y+1), SE (2x+1, 2y+1), NW (2x, 2y), NE (2x+1, 2y).
- Roots are stably re-sorted each frame by `dlon² + dlat²` from the camera
  (no wrapping). Children near to far by the camera's side of the SW
  child's east/north edges. Order affects the list order and load queues,
  not the selected set.
- TraversalDetails: allAreRenderable (AND), anyWereRenderedLastFrame (OR),
  notYetRenderableCount (SUM).

```text
selectTilesForRendering:
  tilesToRender = []
  for root in sorted roots:
    if !root.renderable: queue HIGH
    else visitIfVisible(root, occluder if roots > 1, ancestorMeetsSse=false)

visitIfVisible(t):
  if visible(t): return visitTile(t)
  if rect(t) contains the camera: (queue MEDIUM if no vertexArray) t.result = CULLED_BUT_NEEDED
  else: (queue LOW if preloadSiblings || level 0) t.result = CULLED

visitTile(t, aMS):
  meetsSse = sse(t) < max; last = lastResult(t)
  if meetsSse || aMS:
    ok = orig(last) in {RENDERED, CULLED} || last == NONE || t.state == DONE
         || canRenderWithoutLosingDetail(t)
    if ok: (queue MEDIUM if meetsSse) render t; return
    aMS = true; (queue HIGH if meetsSse)
  if canRefine(t):
    if all 4 children upsampledFromParent: render t; queue MEDIUM; return
    t.result = REFINED; visit children near to far
    if children added tiles and !all renderable and !any rendered last frame:
      kick: drop the added tiles, render t (loadingDescendantLimit 20 resets queues)
    if preloadAncestors: queue LOW t
    return
  render t; queue HIGH
```

Settled equivalent: not visible → culled; meets SSE → render; can't refine →
render; all children upsampled → render; else visit children. Never-loaded
tiles use the nearest loaded ancestor's heights, so which tiles were queued
and loaded matters as well as the decision rules.

## 5. Loading

- HIGH: non-renderable roots; a meets-SSE tile that can't render without
  losing detail; a non-refinable rendered tile. MEDIUM: renderable
  meets-SSE tiles; all-upsampled parents; kicked tiles over the descendant
  limit; culled tiles containing the camera without a vertexArray. LOW:
  refined tiles with rendered descendants (preloadAncestors); culled level-0
  tiles (or all culled tiles with preloadSiblings).
- Priority: `(1 - dot(normalize(obb.center - camPos), camDir)) * distance`.
- `processTileLoadQueue` trims the LRU to tileCacheSize, then loads high,
  medium, low within 5 ms (at least one tile).
- With any loading imagery layer `upsampledFromParent` is effectively false,
  so the all-upsampled rule only fires without imagery: match the imagery
  configuration in parity runs.
- `canRefine`: own terrainData, else the provider's child availability
  (CesiumTerrainProvider: false above maxLevel, true if listed, undefined if
  metadata pending).

## 7. Parity hazards

- History: cached tiles keep tight own bounds; use fresh state per pose.
- Hysteresis while zooming out (canRenderWithoutLosingDetail) affects
  transients only.
- Timing: 5 ms load slice, request throttling, async worker mesh creation
  and upsampling change intermediate frames, not the settled set.
- Camera feedback: terrain collision, underground mode (disables fog and
  horizon culling).
- Floating point: float64 throughout; the fog cull `fog >= 1.0` depends on
  `exp` underflow; `Rectangle.contains` uses EPSILON14 on longitude.
- Fog is on below 800 km and varies with view direction; error is divided
  by pixelRatio after the fog term.
- No randomness in selection.
