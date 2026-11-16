# Real-time tracks (after Custom shading)

**What this holds:** The real-time tracks milestone as planned and worked through. Open points in it are not work items yet. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

- [real-time-tracks.md](../design/real-time-tracks.md): track collections as instance data with a bulk update API,
  GPU clamping, interpolation between feed samples, billboard symbology
  with custom shading, labels with decluttering, picking per track.
- _Exit_: 100,000 clamped tracks updated at 10 Hz from a synthetic feed
  over terrain and 3D Tiles hold frame rate with flat CPU cost, measured
  against 1.x entities in the benchmark suite.

**Increments (r47).** (1) Billboards, and custom alpha in every pass.
(2) A track collection: feed samples as instance streams with bulk
updates, interpolation in time, model and billboard representations,
and the model/symbol choice per instance in the cull pass. (3) Clamping
on the GPU to terrain and 3D Tiles. (4) The showcase (Dyno's Examples
section) and the benchmark against 1.x entities and billboard
collections. (5) Labels with decluttering. (4b, r48) The collection
reshaped as a live point source drawn by styled layers (below), which
reaches 10 million points.

**Increment 1 (r47): billboards; custom alpha in every pass.**

- `DrawOptions.billboard: { size, depthTestDistance }` draws the mesh
  (`createBillboard("center" | "bottom")`, a unit quad) facing the
  camera: after the custom vertex stage, a corner's model xy is a pixel
  offset on screen from the instance's (or draw's) position, times
  `size` and the instance's scale, so a shader can rotate and scale
  symbols per instance. Within `depthTestDistance` meters a billboard
  draws in front of everything (1.x `disableDepthTestDistance`).
  Billboards are unlit, cast no shadows and stay out of the
  ambient-occlusion prepass (a batch flag); they pick per instance. The
  record's last spare words hold the size and distance.
- Custom alpha reaches every pass: the depth prepass's alpha to coverage,
  the cut-outs of shadow casters and the ambient-occlusion prepass, and
  the translucent passes now share `materialAlpha`, which runs the custom
  shader's `fragmentMain` (in uniform control flow, as it may sample
  textures); the opaque pass checks an alpha mask after it. Before, a
  custom alpha cut only the color, leaving depth (holes) and shadows.
  The engine's own shader leaves alpha unchanged, to the bit.
- Harness, 5 new cases (51 of 51 pass): masked boxes cut out entirely by
  a custom alpha match the boxes hidden exactly (no depth, shadow or
  ambient-occlusion trace); stripes cut out; three 48 px billboards in
  front of everything cover 3 × 48² px within 3%; a 400 px billboard
  cut out entirely matches it hidden; symbols from a texture, scaled per
  instance. A case can now check its image (`Case.check`). Parity,
  models and translucency unchanged (318 image metrics) but for one run
  in which translucency's near-opaque scene differed between draw orders
  (order max 0.0054, its image metrics unchanged). It isn't this
  increment's: the commit before it does the same in 2 of 8 runs
  (increment 3), so it's a latent intermittent in that scene's order
  check, recorded under translucency to look into. The bench passes 51
  of 51.

**Increment 2 (r47): the track collection.**

- `new Tracks(engine, world, { capacity, origin, model, billboard,
switchDistance, delay, clock })`: tracks as instance data. Positions
  are meters in an east-north-up frame at `origin` (float32 keeps
  centimeters within a few hundred kilometers), headings radians
  clockwise. `update(first, samples)` takes a feed update for many
  tracks as one `Float32Array` (x, y, z, heading each): the CPU shifts
  each track's last sample to its start and stamps the new one with the
  clock (27 ns a track), then one copy reaches a state buffer.
  `count` shows the first tracks; `setSymbols` writes the billboards'
  per-track data (symbol, color) for their custom shader.
- Each frame a kernel (tracks.wgsl), dispatched once per world before
  culling (`World.addFrameCompute`), interpolates every track between
  its two samples at the clock minus `delay` (shorter way round for
  heading), orients it in the local frame at its position (a sphere's
  up; 0.1° over 100 km), and writes its instance rows straight into the
  world's instance table: per model primitive the model-frame placement
  conjugated into the primitive's frame (as `setModelInstance`), and the
  billboard's position. No per-track CPU work while tracks move.
- Model up close, symbol from afar: instances carry a distance rule
  (`InstanceOptions.visibleWithin` / `visibleBeyond`; `InstanceFlags` 2
  and 4 with the distance as a half float in the flags' high half), which
  the cull kernel applies per instance and view. A collection's model
  draws within `switchDistance`, its billboard beyond. (No hysteresis or
  crossfade yet.)
- Harness `parity/tracks` (`bench/run.mjs tracks`), 6 of 6 pass, with the
  harness's clock: Cesium Milk Trucks within the switch distance and no
  billboards; beyond it three 24 px billboards cover 3 × 24² px within
  5% (area weighted by coverage); `count` shows one; halfway between two
  samples matches a track placed at the midpoint exactly; heading turns
  the trucks; a 100,000-track feed update costs 2.8 ms on the CPU.
  Parity, models and translucency unchanged (318 image metrics; the
  one-off order reading of increment 1 is back to 0); custom shaders 51
  of 51.
- Found: a glTF asset can be placed in only one world (its images are
  released after the first world's upload); the harness loads it per
  world. To fix with the asset cache.
- Not yet: clamping (increment 3), hysteresis and crossfade, the
  kernel's GPU time measured (the benchmark, increment 4), per-track
  tints for models, removing single tracks (`count` and reordering).

**Increment 3 (r47): clamping on the GPU.**

- Ray casts (`castRays`) don't scale to 100,000 tracks at 10 Hz: the CPU
  picks candidate draws and splits jobs per ray. Instead a _height
  capture_ (`Engine.addHeightCapture`): the world's ground seen straight
  down over a square in an east-north-up frame, drawn each frame into a
  depth texture by the first view of the world, with what that view
  selected (terrain, 3D Tiles). Its view block is the view's with an
  orthographic projection and culling box, built like a shadow
  cascade's, and `View.time.y` 1 so the cull kernel drops draws marked
  `ground: false` (`RecordFlags.notGround`: tracks don't land on
  themselves). It draws the casters with their own pipelines (`height*`
  surface keys): the shadows' slope-scaled depth bias would put meters
  of error on slopes at 2 m texels.
- `Tracks` `clamp: { halfExtent, size, top, bottom }` registers one
  around its origin; the kernel reads the ground under each track
  bilinearly from four texels (the highest where some have none) and
  adds the sample's z as the height above it. One frame of latency (the
  kernel runs before the frame's capture). Billboards clamp the same.
- Harness, 2 new cases (8 of 8 pass), against exact ray casts: 1,000
  tracks on ±40 m hills (a 20 m mesh), 2 m texels: error at most 5 mm,
  mean 1 mm; 6,400 tracks over `BatchedColors`' buildings, 0.15 m
  texels: the 128 on roofs within half a millimeter. The 100,000-track
  update read 2.3 to 8.8 ms across runs (to watch on the benchmark).
  Parity, models and translucency unchanged (318 image metrics) but for
  the near-opaque scene's order reading (0.0045 in 1 of 7 runs here);
  the commit before increment 1 does the same in 2 of 8 runs (orders
  0.0054 and 0.0012), so it's latent, not these increments': an
  intermittent in that scene's two draw orders to look into. Custom
  shaders 51 of 51.
- Not yet: captures over areas too large for one texture at the needed
  resolution (a clipmap around the camera, or per-tile captures),
  tilting models to the slope, roof edges (a track straddling one takes
  the higher side), and the capture's GPU cost measured.

**Increment 4 (r47): the showcase and the benchmark against 1.x.**

- _Dyno's Examples_ ([examples-and-the-gallery.md](../design/examples-and-the-gallery.md)): a rail entry and `/#/examples/<id>`. An
  example is a module under `examples/<slug>/` (`examples/types.ts`):
  metadata (title, description, labels, the globe it needs) and
  `run({ viewer, panel, accessToken, signal })`, which builds its scene
  in the gallery's viewer, fills a panel over the view with plain
  elements, and returns its disposer. The page keeps one viewer while
  examples come and go, and shows the module's source. Dyno's ion token
  lookup (pasted, `VITE_ION_TOKEN`, the evaluation token) moved to
  `bench/suite/ionToken.ts` for the Viewer and the gallery.
- _Real-time tracks_, the first example: 1,000 to 100,000 vehicles on
  Lissajous loops within 10 km of Boulder, Colorado (the Flatirons and
  the plains), from a synthetic 10 Hz feed, clamped to Cesium World
  Terrain through a 4,096² capture (5 m texels). Cesium Milk Trucks
  within 500 m of the camera, symbols beyond: four MIL-STD-2525-style
  affiliation frames (rectangle, diamond, square, circle) shaped and
  filled by a custom shader from two per-vehicle values (`symbol`,
  `fill`), cut out of the quad by `billboard.alphaCutoff` (new). Symbols
  shrink as they crowd (18 px at 1,000, 10 px at 100,000), so the
  meter's exposure keeps to the terrain. "Follow a vehicle" chases one
  from behind until the camera is moved.
- In Dyno (the full viewer: terrain, imagery, atmosphere, shadows, AO),
  60 fps throughout: 10,000 vehicles CPU 0.8 to 1.0 ms and GPU 2.4 to
  2.8 ms per frame; 100,000 CPU 0.8 to 1.0 ms and GPU 5.5 to 7.0 ms. A
  feed update at 100,000 is 1.4 ms in the engine; making the synthetic
  samples in JavaScript is 9 ms on the main thread (a real feed would
  arrive decoded, or be decoded in a worker).
- Fixes it found: track headings are now compass courses (clockwise
  from north, the model's forward along them), as feeds give them; the
  kernel had 1.x's model convention (0 east), so trucks drove sideways.
  `ViewerOptions.maxInstances` (the default 16,384 rows hold no
  100,000-track collection). The engine's frame readbacks (exposure
  meter, depth range, list counts, HDR reads, picks) no longer reject
  unhandled when the engine is destroyed mid-frame.
- _The benchmark_ (`bench/tracksBench`, the Lab's "Tracks against
  1.x"): a 10 Hz feed, 16 px symbols, 4 s per configuration; update is
  the engine's part only (2.0 `Tracks.update`; 1.x setting each
  billboard's or entity's position). Median frame CPU, p95 frame
  interval, and GPU time (2.0's timestamp queries), on the NVIDIA
  Lovelace laptop GPU:

  | Tracks  | Configuration             | Create ms | Update ms | Frame CPU ms | p95 frame ms | GPU ms |
  | ------- | ------------------------- | --------: | --------: | -----------: | -----------: | -----: |
  | 1,000   | 2.0 `Tracks`              |         4 |       0.1 |          0.4 |         16.8 |   0.08 |
  | 1,000   | 2.0, clamped              |         2 |       0.1 |          0.4 |         16.7 |   0.38 |
  | 1,000   | 1.x `BillboardCollection` |         9 |       0.2 |          0.9 |         16.8 |      – |
  | 1,000   | 1.x entities              |        12 |       3.4 |          1.1 |         16.8 |      – |
  | 10,000  | 2.0 `Tracks`              |        10 |       0.3 |          0.4 |         16.8 |   0.31 |
  | 10,000  | 2.0, clamped              |         8 |       0.4 |          0.4 |         16.8 |   0.81 |
  | 10,000  | 1.x `BillboardCollection` |        35 |       0.8 |          1.0 |         16.8 |      – |
  | 10,000  | 1.x entities              |        65 |      33.2 |          5.5 |         33.4 |      – |
  | 100,000 | 2.0 `Tracks`              |        84 |       1.4 |          0.3 |         16.8 |   3.56 |
  | 100,000 | 2.0, clamped              |        53 |       1.3 |          0.4 |         16.8 |   3.78 |
  | 100,000 | 1.x `BillboardCollection` |       286 |       8.1 |         32.6 |         50.1 |      – |
  | 100,000 | 1.x entities              |       822 |     364.4 |         55.1 |        599.9 |      – |

  2.0's CPU per frame is flat in the count; its update grows with the
  bytes copied (1.4 ms for 1.6 MB at 100,000). Clamping costs the
  capture's GPU time (about 0.3 ms at 4,096² over hills) and no CPU. 1.x
  entities miss the frame from 10,000 (2 fps at 100,000); the
  `BillboardCollection` holds 10,000 and drops to 20 to 30 fps at
  100,000. Its frame CPU at 100,000 read 3.7 ms in an earlier run (p95
  49.9 ms both times), so that figure is noisy. Not measured yet: 1.x
  clamped (`HeightReference.CLAMP_TO_GROUND` on 100,000 billboards),
  over 3D Tiles, update-to-display latency.

**Increment 4b (r48): live points drawn by the vector styling language.**

The track collection mixed three jobs: a live data source (bulk updates,
interpolation in time, clamping), a representation (a model near the
camera, a billboard beyond) and symbology (a hand-written custom shader
over anonymous per-instance values). The second and third are styling,
and the vector styling language (the plan owner's vector style lab, a
draft successor to 3D Tiles styling) already expresses them: `shape`
marks with well-known marks and symbol resources, `model()` shapes with
`heading` (`EXT_models`), `filter`, `scales`, `parameters`. So the public
shape became a source and a styled layer, and "tracks" is only the
example's name:

- _`PointSource`_ (vector/PointSource.ts): points as GPU data, not
  objects. `update(first, samples)` is one copy of four floats a point
  (x, y, z in an east-north-up frame, heading in degrees clockwise from
  north) and one dispatch: a kernel (points.wgsl `applySamples`) moves
  each point from where it is shown now to its new sample over the next
  `delay`, so updates arriving at any rate never jump. Each frame
  `placePoints` interpolates, clamps to the height capture, and writes
  each point's anchor into the world's vertex arena and its heading into
  its properties. Properties are typed columns (numbers, vectors,
  integers, enums by name), written with `setProperties`
  (`packProperties` builds them by name). No CPU work per point per frame.
- _Point sets in the world_ (`World.addPointMesh`): the plan's point
  expansion by vertex pulling, built. A point mesh holds anchors and the
  points' property streams in the arena, shared by every draw of it; a
  draw (`RecordFlags.points`) draws six vertices a point, expanded on
  screen like a billboard, the point being the instance index (styles'
  `instance` values) and the local feature (picking). No instance rows:
  the indirect arguments already serve a non-indexed draw (the indexed
  layout's first four words read as `drawIndirect`'s). Points shade
  outside the opaque pass's depth prepass (`opaquePoints`: depth tested
  and written as they shade, as lines are), since six vertices a point
  would cost twice there.
- _`VectorLayer` and `compileVectorStyle`_ (vector/VectorStyle.ts): a
  style compiled to WGSL per point layer. Supported so far: `parameters`
  (numbers, booleans, colors, as uniforms: `setParameter` changes them on
  the GPU without recompiling), `defines`, `let`, layer groups with
  inherited `filter`, `let` and `placement`, categorical and linear
  `scales`, `match()`, `??` (the left side where it compiles: the GPU has
  no undefined), enums compared with their names, units (`14px`, `2km`,
  `90deg`); at points the `shape` mark with the well-known marks and
  straight-line symbol paths as signed distances in the fragment stage,
  `size`, `rotation` (`rotateWith` screen or map), `fill.color`,
  `outline`, `opacity`, `placement.offset`; and `model('name')` shapes
  with `heading` and `scale`. Anything else is refused at its path.
- _A scope the spec lacks: `${view.distance}`_, a feature's distance from
  the camera, per point and per view (the vertex stage reads the point's
  camera-relative position, `cesiumAnchor`). The spec's `${view.…}` values
  are global to a view (`scale`, `zoom`), so a model up close and a symbol
  far away weren't expressible; with it they are two filtered layers:
  `"${view.distance} < ${param.switchDistance}"` and its opposite. To
  propose for the draft.
- _`ModelPool`_ (vector/ModelPool.ts): a `model()` layer's instances, a
  fixed number of slots given each frame on the GPU to the nearest points
  its compiled filter passes: the points that pass are counted by
  distance in a log histogram (eight bins an octave), the cut is the
  farthest bin whose points all fit, and each point nearer than it claims
  a slot and writes the model's instance rows (oriented by the style's
  heading). Memory follows the slots, not the points. With several views,
  "distance" for models is the nearest view's (shapes use each view's).
- _The world's instance tables grow as used_ (`maxInstances` is now a
  ceiling within the device's limits; the GPU tables start at 16,384 rows
  and double, rebinding what reads them), and instance culling dispatches
  in two dimensions past 65,535 groups.
- _`Tracks` is gone_: its harness (the Lab's "Live points and styled
  layers", 8 of 8) and the benchmark against 1.x run on a `PointSource`
  and a `VectorLayer`. Clamping errors are unchanged (hills within 5 mm,
  roofs within half a millimeter); a 100,000-point feed update is 1.0 ms
  on the CPU (2.7 with `Tracks`, which shuffled samples per track there).
  With a delay of 0 a point shows its latest sample; interpolation needs a
  delay (the feed's interval), since points move from where they're shown.
- _The benchmark against 1.x, rerun_ with points: at 100,000 tracks 2.0
  creates them in 18 ms (84 with `Tracks`), updates in 1.0 ms (1.4),
  spends 0.4 ms of CPU and 2.7 ms of GPU a frame (3.6), clamped 3.0; 1.x's
  `BillboardCollection` 552 ms, 10.1 ms, 4.0 ms (p95 frame 50 ms), its
  entities 1,837 ms, 614 ms, 88 ms (6 frames in 4 s). 1.x read slower than
  in increment 4's runs: its figures vary between runs.
- _No varying of its own for `${view.distance}`_: every inter-stage
  location is in use (a custom shader's four named values take 10–13,
  and translucency's list pass reads `front_facing`, which counts against
  the 16), and a 17th failed to compile there. The vertex stage sets it
  from the point, instance or draw; the fragment stage from the fragment's
  position, which for billboards and points is their anchor.
- _Unlit draws_ (billboards, point sets, lines, unlit photogrammetry) no
  longer march the air per vertex (their color shows as is, so the march
  was wasted: from above 5 km every symbol vertex marched 24 steps), and
  write alpha 0 to the scene target, so the exposure meter leaves them out:
  a view full of symbols no longer metered as black and burned out the
  terrain.

**The example, rebuilt** (examples/realtime-tracks): a worker stands in
for a database or message stream: each vehicle a row (position, course,
speed, turn rate), dead-reckoned with wandering turns and turned back at
the area's edge, sent in slices within a stream's budget (2.5 million
records a second), so at 10 million vehicles each reports every 4 s and
is shown that far behind. The panel: vehicles (1,000 to 10,000,000), area
(5 to 400 km across), the feed's updates a second, speed, turning and
pause; and the style's own parameters as controls (trucks within: none,
250 m to 2 km, or all of the nearest 10,000; symbol size; outlines), with
"Follow a vehicle" chasing one from behind. The style is in the example's
source, in the language.

Measured in Dyno (the full viewer: terrain, imagery, atmosphere,
shadows, AO; NVIDIA Lovelace laptop GPU), the overview of 20 km:

| Vehicles   | GPU per frame | CPU per frame | Frame rate | Feed (CPU per slice)        |
| ---------- | ------------: | ------------: | ---------: | --------------------------- |
| 100,000    |        3.7 ms |        1.0 ms |     60 fps | 0.5 ms for 100,000 at 10 Hz |
| 1,000,000  |       13.1 ms |        1.5 ms |     60 fps | 2.3 ms for 250,000 at 10 Hz |
| 10,000,000 |         60 ms |        3.2 ms |  12–16 fps | 2.4 ms for 250,000 at 10 Hz |

Over 400 km, 100,000 take 3.4 ms of GPU and 10,000,000 57.5 ms. Before the
prepass and air changes, 1,000,000 took 45 ms and 10,000,000 70 ms. Ten
million is bound by its 60 million vertex invocations a frame.

_Per-point culling (r48)._ Each view's cull pass (cull.wgsl `cullPoints`,
not the shadow cascades' or height captures', which don't draw points)
lists the points in or near its frustum (64 pixels of slack) in the set's
list in the arena, counted per workgroup and then once globally (ten
million adds to one counter serialized for seconds a frame: the first
version stalled at 10 million); `writePointArgs` then draws six vertices
per listed point (`vsPoints`). Measured on a 2,928 × 1,750 canvas against
the commit before: following a vehicle among 10,000,000, 23–27 ms of GPU
against 32 (the opaque pass 10–13 ms); in the overview, with every point
in view, unchanged (76 against 74 ms), the cull itself 1.2 ms. Four-vertex
strips, one instance a point, drew slower than the six-vertex list (the
opaque pass 70 ms at 10,000,000): an instance of four vertices fills few
of a vertex wave's lanes, so quads stay six vertices in one draw.

_Tiny symbols rasterized in compute (r48)._ Lists are now per point draw
(a vector style's layers keep different points), and a draw's cull can be
a compiled kernel (`World.setPointCuller`, `PointCuller`): each shape
layer's style compiles to compute functions too (`styleShow`,
`styleSize`, `styleColor`, `styleShapeAt`), and in each view its kernel
(pointCull.wgsl) lists the points whose symbols are larger than
`splatBelow` pixels (`VectorLayer`, default 6) for quads, and rasterizes
the rest: their depth by `atomicMax` on each pixel their shape covers
(always the one under the center), then their color and feature where
their depth won, in per-view buffers a word a pixel. A triangle over the
view in the opaque pass (splat.wgsl, after its other draws) writes their
color (display-referred, as unlit symbols'), feature (picking) and depth,
depth-tested, so hills still hide the points behind them. GPU time a
frame, rendered one at a time to the GPU's completion on a 2,928 × 1,750
canvas, against quads for the same points: 1,000,000 in the overview
17.4 ms against 21.9; 10,000,000 in the overview 40.9 against 83.4;
following a vehicle among 10,000,000 (10,000 trucks, symbols up close)
45.4 against 44.7. (In a hidden Browser pane the page draws about one
frame a second, which read as a stall: measure with the pane shown, or
one frame at a time.)

_Antialiased symbols (r48)._ Symbols were cut out at alpha 0.5 per pixel
(quads) and one sample a pixel (splats): jagged edges that flickered as
points moved. Now a style's symbol is its signed distance in pixels:
quads (a pixel larger each way) give each pixel its coverage, written as
the share of the pixel's four MSAA samples it covers (`fsPoints`, its
`sample_mask`; alpha-to-coverage would read the scene target's alpha,
which unlit draws leave 0 for the exposure meter), and outlines' inner
edges blend by it too. Splats keep their coverage in the color's alpha
and the resolve blends the display color over what is drawn by it. Their
depth stays the anchor's: a symbol centered on a point on the ground is
half under the ground in front of it, so the demo stands its symbols on
their points (`placement.offset`, which the splat kernel now reads too,
`styleOffset`), as 1.x's `verticalOrigin: BOTTOM`.

Not yet: fewer varyings for point sets (they share `VsOut` with every
draw), labels
(increment 5), Bézier symbol paths (Slug), `sizeWith`, heights in
`placement.offset`, lines and polygons from live sources.

**Found on the way: the instances benchmark's GPU time grew 36 → 160 ms**
at 100,000 instances (500,000 items) since 2026-11-02. A bisect over the
benchmark (noisy: three readings of 66–70 ms before a commit that read 39) pointed at two steps: the depth prepass in the MSAA opaque pass
(`fc29bf1797`, 39 → 79 ms) and shadow cascades fitted to the depth on
screen (`386da0c21d`, → 138 ms). Done (r49): only the prepass was real.
The benchmark's view has no shadows (`View.shadows` is off by default),
so the cascades never run there; the 138–180 ms readings were the GPU's
clock. The GPU ran the benchmark at well under half its top clock
(software thermal slowdown), and one commit read 71–88 ms from run to
run; HEAD read 67–88 ms when measured beside the fix, never 160.
Instanced batches now draw outside the prepass, as point sets do
(`opaqueInstanced`, one- and double-sided: depth tested and written as
they shade): 100,000 milk trucks are about 360 million triangles, half
of them in view, each truck a few pixels, so the pass is bound by
vertices, and drawing them twice cost what equal-depth shading saves.
`Engine.gpuPasses` gives the GPU time per pass (the timer's labels; the
benchmark records it):

| 100,000 instances, ms |    cull | sky-view | aerial-perspective | opaque | total |
| --------------------- | ------: | -------: | -----------------: | -----: | ----: |
| With the prepass      | 0.9–1.2 |     0.07 |                0.1 |  70–79 | 72–81 |
| Instances outside it  | 0.8–2.3 |     0.07 |           0.07–0.2 |  39–40 | 40–42 |
| `b7f9c8c039` (before) |         |          |                    |        | 37–40 |

Runs alternated with HEAD and `b7f9c8c039`; rerun with the GPU otherwise
idle (checked before each run), the fix read 40.5 and 41.0 ms, HEAD 68.6
and 67.2, `b7f9c8c039` 38.7 and 37.5 (earlier readings overlapped other
GPU work and read HEAD at 83–88). 10,000
instances take 4.7–5.0 ms against 8.0–10 with the prepass. No shadows,
ambient occlusion, lights or translucency in this benchmark: the opaque
pass is nearly all of it. Parity, models and customShader unchanged
(customShader's property-attribute case reads one of two values a 1e-7
apart at HEAD too); translucency unchanged but for the near-opaque
stack's order check, which reads 0 or about 2e-7 from run to run with or
without this change (likely ties between equal depths in the exact
lists).
Not yet: with the view's shadows on, the four cascades took 154 ms at
100,000 instances against the opaque pass's 42 (15 against 5 at
10,000; one run, possibly beside other GPU work): each cascade draws
about as many trucks as the view does.
Casters too small to matter in a cascade (a few texels) are the next
thing to cull there.
