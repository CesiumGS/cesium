# M3 progress

**What this holds:** M3's increments: quantized-mesh terrain, globe selection, horizon culling, imagery and camera, content in and out of a live world, height queries and clamping, and the close-out. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

## Increment 1 (r23): quantized-mesh terrain through the shared streaming

- **`TileSource`** (`Tileset3D.fromSource`): a source supplies its root,
  content loader and placement; selection, per-origin request windows,
  cache, view masks, pipeline stats and on-demand rendering are shared.
  3D Tiles keeps its own path.
- **`TerrainSource`** (`src/globe`): `layer.json`, availability ranges
  (from `layer.json` and each tile's metadata extension), an implicit
  geographic quadtree of ordinary `Tile`s with region volumes, grown as
  tiles load. Geometric error per level as 1.x (level 0
  `R·2π·0.25 / (65·2)`, about 77 km); skirts five times the level's error.
- **Worker decode**: header, zigzag-delta vertices, high-water-mark
  indices, oct-encoded normals, metadata availability, skirts; content is
  a mesh relative to the tile center, placed Earth-fixed (`axes: "none"`).
- **`engine.addTerrain(world, url, options)`**, SSE 2 by default (1.x's
  globe). The viewer's Cesium World Terrain toggle (ion asset 1) replaces
  the context ellipsoid.

Cesium World Terrain streams levels 0 to 16 over Philadelphia, with OSM
Buildings standing on it: OSM's heights come from CWT, so no clamping is
needed (1.x's height references are for entities and primitives).

Terrain exposed two on-demand rendering bugs, both fixed: the scene
fingerprint used a world's index, which shifts when a world is removed
(`World.id` now), and a tileset with no view yet, or with wanted tiles
waiting for a request window shared with another tileset on the same
origin (OSM and CWT are both on `assets.ion.cesium.com`), went inactive
and stopped asking.

Horizon culling then went into the prep kernel (r23, retired in r25: see
increment 3).

## Increment 2 (r24): globe `Stepwise` selection and L1 parity

- **`GlobeStepwiseSelection`** (`src/globe/GlobeStepwise.ts`), chosen by
  `TerrainSource.createSelection` for `policy: "stepwise"`: 1.x
  `QuadtreePrimitive` traversal (level-zero sort, near-to-far children,
  `TraversalDetails`, kicking, `loadingDescendantLimit`,
  `canRenderWithoutLosingDetail`) over `GlobeSurfaceTileProvider`
  visibility: fog-adjusted SSE and fog culling, region distance with the
  ancestor-height collapse, OBB frustum test, horizon test against an
  ellipsoid shrunk below sea level. The high, medium and low load queues
  become request priority bands ordered by 1.x's load priority.
  Specification: `docs/globe-1x-spec.md`.
- **Bounds**: a terrain tile's volume tightens to its own heights when it
  loads; until then the nearest loaded ancestor's. The decoder recomputes
  1.x's occludee for tiles reaching below sea level; those skip the GPU
  horizon test, which lacks the shrink (a follow-up).
- **Children before content**: the globe selection creates a tile's
  children as soon as their availability is known (1.x `canRefine`), so
  1.x's loading of descendants ahead of their parents carries over.
- **Upsampling**: all four children are created when any has data; those
  without (and four under a loaded leaf, when refining it) are drawn from
  the nearest tile with data, clipped to them (the mixed-LOD clip boxes).
  As in 1.x they are upsampled only once queued, so a tile whose quadrants
  are all culled draws nothing, and an upsampled quadrant is bounded by
  the height range of the mesh clipped to it, which the decoder computes.
  `Budgeted` draws missing quadrants the same way: partial availability
  no longer leaves holes.

**Parity** (`parity/globe.html`, runner suite `globe`): six cameras
(Rainier, Grand Canyon, Matterhorn near the horizon, Everest, the Front
Range from 300 km, the San Francisco coast with ocean quadrants), fresh
tile state per camera in both engines, no imagery. 100% Jaccard on all six
with 1.x's fog and with fog off (2–41 tiles per camera); each camera
settles in 0.4–1.9 s per engine, the whole run in about 13 s. The last
mismatch to go was the upsampled quadrant bounds: 1.x culled a quadrant
with its clipped mesh heights that 2.0 kept visible with the parent's.

Found along the way: a request that completed without content to upload
(an external tileset, a failure) left a tileset idle without another
update, so the children of OSM's external tilesets were never selected
(4 of 12 tiles drawn at Rainier) and the viewer showed one request in
flight forever. Any completion now counts as a change.

## Increment 3 (r25): horizon culling in selection; `Budgeted` on terrain

Switching the viewer to `Budgeted` over Cesium World Terrain and OSM
Buildings at Mount Rainier loaded slowly: OSM took 783 requests to draw 16
tiles (`Stepwise`: 17), and terrain waited behind them on the shared ion
request window. All of them were prefetches, 1,000 to 3,000 km away.

- **Empty tiles refine by SSE, as in 1.x.** `Budgeted` always refined tiles
  without content, so prefetch walked through OSM's content-less tiles to
  the first content everywhere its guard band touched, at about 0.1 px of
  error. An empty tile now refines only when its SSE exceeds the threshold
  (expanded external tilesets still always do).
- **Horizon culling in selection.** `Budgeted`'s visibility and prefetch
  test each tile's horizon-occlusion point in float64 with 1.x's per-tile
  ellipsoid shrink (a region's top corners, a box's eight corners), cached
  per volume; `horizonCulling = false` turns it off for views under or
  through the surface. 1.x culls only its globe this way.
- **The GPU horizon test is retired.** Pressure-tested before adding the
  shrink to it: culling in the draw kernel saves only draws, not fetches;
  in float32 it misplaces the horizon for cameras below about 10 m (4.4 to
  5.4 km instead of 5.1 km at 2 m), enough to cull flat ground wrongly; and
  a per-record shrink makes the cancellation worse. The selection already
  visits every terrain tile per view, so a float64 test there is cheap and
  exact. Records are back to 192 bytes.
- **Per-tile shrink, not a global one.** A shrink to the dataset's lowest
  point (bathymetry: -11 km) would move the horizon from 5 km to about
  375 km for a camera 2 m up, removing most culling. The per-tile shrink
  assumes the ground between the camera and a tile is no lower than the
  tile's minimum: true for land terrain, not always for bathymetry seen
  through water (a later concern, with an underground mode).

Measured from fresh loads (requests; OSM / CWT):

| View                            | Before  | SSE rule only | Both     |
| ------------------------------- | ------- | ------------- | -------- |
| Rainier, 9 km range, pitch -30° | 783 / - | 35 / 71       | 31 / 65  |
| Philadelphia, 1.5 km, pitch -3° | -       | 60 / 129      | 56 / 124 |

The SSE rule is the main fix; horizon culling trims another 5-10% here
and matters more for high, grazing views. Selection, globe, tileset,
models and Slang suites are unchanged (100%).

## Increment 4 (r26): imagery, the ellipsoid globe, camera, display-referred color

**Imagery** (`GlobeImagery`, `ImageryProvider`; spec in
`docs/imagery-1x-spec.md`):

- Each drawn terrain tile gets a slice of a per-world `texture_2d_array`
  (rgba8unorm, 256×256 with mips), bound once for the whole globe. A
  compute pass fills the base color (1.x dark blue), reprojects each
  overlapping Web Mercator source tile, then builds mips. Source
  coordinates per texel row are computed on the CPU in float64, as
  absolute radians in float32 would be off by about 8 texels at level 18.
- Imagery level per terrain tile as 1.x (texel spacing against the tile's
  geometric error); until a tile's slice is ready it draws its nearest
  ancestor's, up to 8 levels up, packed into the record's existing
  `imagerySlice` word (records stay 192 bytes).
- Source tiles go through the origin's request window and decode in
  workers; Bing's empty tiles fall back to their nearest ancestor with
  imagery; slices and sources are recycled least recently used.
- `BingImagery.fromIon` (ion asset 2, the Bing metadata service) and
  `UrlTemplateImagery`; the Bing logo and its imagery providers' credits
  join ion's attributions.
- Parity (`parity/imagery.html`, suite `imagery`; CWT with identical
  selection, fog and atmosphere off): FLIP 0.029-0.047, mean ΔE 0.9-1.6
  on four cameras. The rest is filtering and level choice (spec §7);
  2.0 may look better here and is not forced to match.

**The ellipsoid globe** (`engine.addEllipsoid`): 1.x's
`EllipsoidTerrainProvider` as a `TerrainSource` whose tiles are all
available and built flat in the worker (16×16 at height 0, skirts), so it
is selected, horizon-culled and draped exactly like CWT. It replaces the
viewer's static globe (facets sagging up to ~30 km) and the ground patch
that covered for it; `Tileset3D.show` hides a globe. The viewer starts the
globe hidden for site-scale content reaching below the ellipsoid
(underground infrastructure, models at sea level where the geoid is below
it).

**Camera** (`GlobeController`, 1.x 3D `ScreenSpaceCameraController`):
drag grabs the point under the cursor (kept within 2 m), wheel and
right-drag zoom toward the cursor (multiplicative, smoothed over about
150 ms), middle- or ctrl-drag tilts about the screen center, shift-drag
looks; spin momentum. `View.pickPosition` reads the depth under a pixel
(kept only in frames that serve a pick) and rebuilds the position in
float64. The camera stays 1 m above the ellipsoid until terrain height
queries exist.

_r39_: as 1.x (whose `constrainedAxis` is the globe's axis and whose zoom
restores heading, pitch and roll after each step), the camera never
rolls: every motion levels it against the geodetic up, and zoom carries
heading and pitch from the old position's east-north-up frame to the new
one, turning the globe so the point under the cursor stays there
(zooming from 6,000 km to 1 km: roll 0°, was 10.5°; the target 0 px
off). Zoom over the sky heads for the ground below the camera; height is
capped at 100,000 km. The near plane is a fixed 0.1 m (as 1.x's default):
with reverse-Z and an infinite far plane depth precision doesn't depend
on it, and a near plane scaled to what was framed clipped Google's tiles
when zooming in from the whole globe. The underlay's depth scale went
from 2⁻²⁷ to 2⁻⁶⁴ with it, since at 0.1 m content beyond 13,400 km fell
inside the underlay's range and picks there landed at the camera.

**Display-referred color.** Unlit color (globe imagery, unlit glTF such
as Google's photorealistic tiles and most photogrammetry, the viewer's
Unlit override) was exposed and PBR Neutral tonemapped like light,
darkening photographs by 8-12 levels and crushing shadows; 1.x, with HDR
off by default, shows them as is. Imagery FLIP against 1.x went from
0.198 to 0.035 when fixed.

- Fix: a third opaque-pass target (rgba8unorm-srgb, alpha as coverage)
  takes unlit color; the present pass tonemaps the scene part,
  renormalized by its coverage, and adds the display part. Exact for
  covered pixels, coverage-weighted at MSAA edges; the HDR alpha stays
  free for translucency.
- Rejected: inverse tone mapping into the HDR target. PBR Neutral's
  highlight desaturation makes bright saturated colors unreachable
  (about 10% of 8-bit sRGB colors come back off by more than a level,
  the worst by 206). A first version used the HDR alpha as a marker;
  it worked but overloaded alpha and blended the two kinds of color.
- Cost: the 1080p benchmark (about 20k draws, 4× MSAA) went from 1.57 to
  1.85 ms of GPU time per frame, the bandwidth of one more MSAA
  attachment. Options if it matters: skip the target in views without
  unlit content, rgb10a2 or rgba8 without MSAA plus a coverage bit, or
  tonemapping as the final step of a deferred resolve (M5).
- The models, tileset and L2 parity pages compare unlit color against 1.x
  with HDR off (its default) and lit color with HDR on.

## Content in and out of a live world (r27)

Switching content in the viewer froze the old scene for about 0.9 s, none
of it in the stats panel: every switch built a new world, globe and
imagery and waited on six serial round trips (ion endpoints for the
content, Bing and CWT, Bing metadata, `layer.json`) before the swap.

- **One world:** content (tilesets, models, the city) loads into the
  session's world, hidden while it streams, and replaces the old content in
  one step; the globe and its imagery are built once. Swap after: glTF
  26 ms (was 932), OSM 498 ms (was 840), Google 562 ms, an iModel 1.6 s
  (the export lookup), with no frame over 34 ms and teardown under 1 ms.
- **Endpoint caches:** ion endpoints and iTwin exports for 45 minutes
  (their tokens last about an hour); failures are not kept.
- **One upload budget for all tilesets,** in GPU bytes per frame, the
  update order rotating so none starves: a count per tileset (8) stalled
  frames with several tilesets streaming (Google with OSM: 67 ms frames).
  A fixed 2 MiB slowed a single big tileset (Google jump-in settled 2.2×
  later), so it adapts as request windows do: it grows by a quarter MiB
  while frames are on time and the budget was used up, halves when a frame
  is late (0.5 to 32 MiB). Measured on Google jump-in, with network
  variance between runs: settle 2.9 s against 1.7 s without a budget and
  3.8 s at a fixed 2 MiB; average FLIP while loading 0.173 against 0.192.
- **Eviction spread the same way** (at most twice the upload budget per
  frame unless past the hard limit): after a camera jump everything shown
  before became evictable at once.
- `tsconfig.json` now covers `viewer/`, which had not been type-checked.

**Traced (`bench/trace.mjs`):** a Chrome trace across a camera jump into
an uncached area, with a marker on every frame over 34 ms and V8 samples,
reports what each process and thread did during each slow frame. The
remaining first-visit stalls were promise continuations of 10 to 20 ms on
the main thread (under the 50 ms long-task threshold, so unreported):
reading Google's external tilesets, dominated by `resolveUri`, which
re-parsed the base URL and set its parameters one by one (each set
re-serializes the URL) for every tile. It now parses the base once per
tileset JSON and merges missing parameters in one assignment: JS samples
in slow frames fell from 33,970 to 174, and flights into uncached areas
went from 3-8 frames over 34 ms (worst 83-133 ms) to 0-1 (worst 33-50 ms).

The upload budget now grows by a quarter per on-time frame that used it
up (it reached 12-18 MiB in those flights) instead of a fixed quarter MiB:
Google jump-in settles in 2.0 s (1.7 s without a budget, 2.8 s with
linear growth), average FLIP while loading 0.185. With the budget off, one
flight still had a 100 ms frame, so it stays.

Open: a hitch benchmark (tilesets added, removed and flown into in a live
world; worst frame and frames over 34 ms) as a regression gate, built on
`bench/trace.mjs`.

Next increments: height queries and the CAD tileset on terrain (and the
camera's terrain collision); cross-tileset scheduling (§13.2); fetch
timeouts and retries (§14, item 7); imagery filtering and level choice
against the spec's parity hazards.

## Increment 5 (r29): height queries and clamping

1.x behavior, defects and design notes are in
`docs/clamping-1x-spec.md`.

**Terrain heights.** Tiles keep their decoded u, v, h and triangles.

- `sampleHeight` is the terrain data height (1.x `sampleTerrain`): within
  4e-9 m of 1.x at the same levels on six cameras.
- `surfaceHeight` is the drawn surface: the triangle under the point in
  the finest loaded tile, intersected along the geodetic normal (1.x
  `Globe.getHeight`, what 1.x clamps to). Against 1.x on the same
  selected tiles: within 0.6 mm on five cameras; up to 0.74 m on the
  Matterhorn, all of it on tiles 1.x draws with 12-bit quantized vertices
  (`TerrainEncoding` BITS12, steps of a tile's height range / 4095), where
  2.0 keeps the data's precision. Where 1.x does not quantize the two
  agree within 0.1 mm.
- Camera terrain collision uses `surfaceHeight`.

**Clamping.** `heightReference` on `addModel` (`clampToGround`,
`relativeToGround`, `clampToTerrain`, `relativeToTerrain`,
`clampTo3DTiles`, `relativeTo3DTiles`, with `heightOffset`), as 1.x:
ground is the highest of the globe and the shown tilesets with
`enableCollision`; content moves along the vertical, without re-orienting.
Unlike 1.x it is event-driven:

- Terrain announces the rectangle whose heights changed on each tile load
  and unload; only anchors inside it re-clamp (1.x walks per-tile callback
  lists under a 2 ms budget).
- 3D Tiles heights are ray cast on the GPU (`World.castRays`) for all
  anchors in one dispatch, down the geodetic normal, nearest hit, against
  the collision tiles the views drew; again only while those tilesets
  change, every 10 frames at most.
- A clamped model moves by one `setTransform` on its root transform.

**Ray casting (`World.castRays`, `raycast.wgsl`).** The first `RayQuery`
backend of §13.10: rays in float64; the CPU picks draws whose bounds a
ray crosses and splits them into 64-triangle jobs; a workgroup per job
tests triangles read from the arena (instanced draws per instance) and
keeps the nearest hit per ray with an atomic min; one readback. No views,
render targets or picking passes; a BVH replaces the job list later.

**3D Tiles height parity** (`parity/heights.html`, suite `heights`): OSM
Buildings, 1.x selection, 15×15 grids in Philadelphia and Midtown
Manhattan. Against 1.x `Scene.sampleHeight` (a depth render, so what 1.x
draws): the same 49 and 29 points hit, within 6 mm (1.x depth precision).
Against 1.x `Cesium3DTileset.getHeight`, what 1.x clamps models to: it
misses more than half of those points and returns a lower surface at four
per view (§14, item 9).

**Tilesets.** `enableCollision` (default false, as 1.x) marks content
draws so ray casts with `collisionOnly` hit them; it can change at
runtime. `modelMatrix` places the whole tileset at load (root transform
of the tile tree: boxes and spheres transformed, regions not, as 1.x).
Changing it at runtime (1.x's height-offset Sandcastle) is open: content
can follow through its parent transform, but selection volumes would need
the same transform.

**Viewer.** Placed glTF models are `clampToGround`: on Cesium World
Terrain or the ellipsoid, and on collision tilesets.

Open: billboards and labels (with the vector work), clamping of the
viewer's city boxes, runtime tileset `modelMatrix`, `sampleHeightMostDetailed`
(rays against content loaded for the query, not the views' tiles).

## Increment 6 (r31): M3 close-out

**Model instancing.** `ModelOptions.instances` places a glTF N times with
matrices in its model frame: one draw per primitive with N instances
(L⁻¹·P·L in each node frame, times the primitive's own
`EXT_mesh_gpu_instancing` instances), per-instance tints and feature IDs;
`setModelInstance` moves, hides or tints one without allocating.
Benchmark (`bench/instances`, suite `instances`), the Cesium milk truck (5
primitives, 3,624 triangles):

| Instances | Place | CPU / frame | GPU / frame | Move 1% / frame | Move all |
| --------- | ----- | ----------- | ----------- | --------------- | -------- |
| 10,000    | 25 ms | 0.25 ms     | 3.5 ms      | 0.1 ms          | 8 ms     |
| 100,000   | 96 ms | 0.30 ms     | 35.5 ms     | 1.8 ms          | 101 ms   |

GPU time is linear in triangles drawn (36 M and 362 M), not in culling:
per-instance LOD is the lever (§13.9). A glTF asset is shared within a
world; uploading consumes its images, so another world needs its own
load.

**i3dm.** Instanced 3D Model tiles parse in the worker as 1.x's
I3dmLoader reads them (positions or quantized positions with RTC_CENTER,
orientation from normals, oct-encoded normals or east-north-up, uniform
and non-uniform scale, BATCH_ID, embedded or external glTF) and place as
model instances under a root at their origin. Eight Specs i3dm tilesets
are on the tileset parity page: mean FLIP 0.010-0.018 against 1.x.
`splitGlb` now stops at the GLB's own length (i3dm pads after it).

**Runtime tileset `modelMatrix`.** Content hangs off a tileset root
transform (`modelMatrix` × load-time matrix⁻¹), so moving a loaded tileset
is one transform write; tile boxes and spheres move with it for
selection (regions stay, as 1.x), subtrees built later from external
tilesets included. Verified: content and volumes move by exactly the
change and back.

**Clamping.** The viewer's city buildings each stand on a clamped anchor
(144 of 144 on the drawn terrain surface). While terrain loads, content
sits on coarse tiles whose flat triangles sag far below the ellipsoid
(kilometers at the first levels), as in 1.x; it settles as finer tiles
arrive.

**`sampleHeightMostDetailed`.** `Tileset3D.queryRays` loads every tile
whose bounds a ray crosses down to the leaves (all tiles on the path
under ADD refinement), ahead of the views' requests and pinned against
eviction, external tilesets included; `Engine.sampleHeightMostDetailed`
then ray casts against those draws (`CastOptions.draws`). Against 1.x
`Scene.sampleHeightMostDetailed` on OSM Buildings: the same 123 and 120
of 225 points hit, within 7.5 mm (1.x depth precision).

**Viewer.** The "Parity and benchmarks" panel lists every parity page,
benchmark and spike.

**M3 is complete.** Next: benchmark suite v1 (§16), then M4.
