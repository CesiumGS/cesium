# Transforms and instancing

**What this holds:** Placements, per-node transforms, instancing and how they reach the GPU. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Problem (r27 state).** Every draw record carries its own flattened
placement: an Earth-fixed origin (float64 split hi/lo) plus a float32 3×3
(96 of 192 bytes). glTF node hierarchies and tile transforms are multiplied
out when content is added, and glTF instancing is not supported. Moving
anything means rewriting every one of its records. 1.x needs much more:

- `Model.modelMatrix` changing every frame, driven by entities
  (`SampledPositionProperty`, tracked vehicles, `VelocityOrientation`);
- glTF animation (node TRS per frame down the hierarchy), skins, morph
  targets, articulations;
- instancing: `EXT_mesh_gpu_instancing`, i3dm, `ModelInstanceCollection`,
  with per-instance features (pick, style, show);
- a tileset `modelMatrix` changed at runtime (1.x recomputes every tile's
  `computedTransform`);
- georeferencing frames: east-north-up and heading/pitch/roll, iModel
  `ecefLocation`, `CESIUM_RTC`, glTF axis correction, and later an inertial
  (ICRF) root that rotates against Earth-fixed content each frame;
- clamping: an anchor moving along the vertical.

**Design: a transform table in each world, separate from draw records**
(Filament's TransformManager, Bevy's GlobalTransform).

- _CPU, float64._ `world.addTransform(matrix, parent?)` returns a handle.
  Local and world matrices are float64; a change marks the transform dirty
  and once per frame only dirty subtrees are recomposed, parents first.
  Precision never drops below float64 before upload.
- _GPU entry (80 bytes):_ origin hi/lo, the 3×3 rotation-scale in float32
  and its largest axis scale (for bounds).
- _Draw record (128 bytes, was 192):_ a transform index instead of the
  placement; bounds stay in the transform's local frame, so a moved or
  rotated transform never stales them. The prep kernel reads the transform
  once per record and writes the camera-relative matrix it already writes;
  vertex shaders don't change cost.
- _Content:_ a placed glTF gets a root transform (its `modelMatrix`) and a
  child per node (axis correction × RTC × node). Moving a model is one
  `setTransform` however many draws it has; animation writes node locals;
  clamping moves the root; a tileset `modelMatrix` becomes the parent of
  its tiles' roots. Draw options with a bare origin and model still work
  (the draw owns a transform).
- _Above the world:_ a placement layer (cartographic, heading/pitch/roll
  and `heightReference`) produces anchor matrices; entities evaluate their
  time-dynamic properties into them each frame. Cost: 10,000 moving models
  upload about 0.8 MB per frame. If the CPU becomes the bottleneck the
  hierarchy can be composed on the GPU in float32 below float64 anchors.

**Instancing: instance ranges, culled per instance on the GPU.**

- A record may own a range in the world's instance table: per instance a
  float32 affine relative to the record's transform (instances of one
  model sit within kilometers of it), a local feature ID and flags
  (64 bytes). One record per primitive, however many instances.
- The prep kernel gets a second dispatch over the instance table: each
  instance reads its record and transform, culls its own bounds, and is
  compacted into the record's batch like a record. Batches count items
  (records plus instances), so one indirect draw still covers them all.
- Per-instance feature IDs give picking and styling per instance (1.x
  i3dm `_BATCH_ID`, `EXT_mesh_gpu_instancing` `_FEATURE_ID_n`); moving one
  instance writes 64 bytes.
- Sources: `EXT_mesh_gpu_instancing` (parsed into instance ranges, not
  flattened), i3dm, and an `addInstances` API for application content
  (trees, poles, vehicles).
- Later: record-level pre-culling of the instances' union bounds,
  per-instance LOD, GPU-driven instance updates (simulation in compute).
- _Idea (not committed for the PoC): automatic per-instance LOD._ The r31
  benchmark is bound by triangles drawn (100,000 trucks of 3,624 triangles:
  35.5 ms GPU), not by culling. The worker could build a short LOD chain
  per instanced mesh at decode (meshoptimizer simplification, then an
  impostor for the farthest level), and the instance cull kernel choose a
  level per instance from its projected size, compacting each instance
  into its level's batch, so one draw per level and primitive replaces one
  per primitive. It would make large instance counts (forests, fleets,
  plant equipment) cost what is visible at the detail it is seen.

**Measure.** Pixel-identical parity suites after the switch; bench draw
throughput and prep time unchanged or better (records shrink by a third);
100,000 instances of a multi-primitive model: memory, prep time, frame
time, and the cost of moving all of them each frame.

**Scene fundamentals built with the transform table (r28).**

1. _Assets apart from instances._ A world uploads a parsed glTF once
   (meshes, materials, textures, reference-counted); every placement is an
   instance of it (transforms and draws). A thousand placements no longer
   upload a thousand copies.
2. _Generational handles._ Draw, transform and instance-range slots are
   reused; handles carry a generation, so a stale handle is a no-op instead
   of editing whatever took its slot.
3. _Scatter uploads._ Dirty records, transforms and instances upload as
   packed `{index, data}` pairs that a compute pass scatters (Unreal's GPU
   scene), instead of the whole range between the lowest and highest dirty
   index; contiguous runs still upload directly.
4. _Per-instance data beyond the transform._ The instance table has a
   fixed core (affine, record, feature, flags, tint), and a record may
   point at per-instance streams in the arena, read by instance index the
   way vertices are, for billboards, labels and styling.
5. _Visibility on transforms._ A hidden transform hides its subtree
   (`KHR_node_visibility`, entity `show`, tileset `show`).

**Built (r28).** All of the above except `addInstances` and i3dm. The
per-view kernel is renamed from "prep" to **cull** (`cull.wgsl`:
`cullRecords`, `cullInstances`, `writeDrawArgs`): it culls draw items and
compacts them; draw items are records without instances plus instances.

- Records 192 → 128 bytes; transforms 80; instances 64; per-view draw
  items 80 (was 64, now carrying record, feature, instance and tint).
- Unchanged output: GPU precision bit-identical (35 sites and distances),
  Slang image ΔE 0.000 and cull precision 5.96e-8 for WGSL and Slang,
  model, tileset and selection parity bit-identical, globe heights and
  imagery FLIP unchanged, hitch benchmark unchanged, baseline perf within
  noise.
- `EXT_mesh_gpu_instancing` (Cesium's `BoxInstanced` samples) draws as
  instance ranges; a glTF placed twice in a world uploads once.
- 16,000 instances of one mesh (viewer, RTX 3000 Ada laptop): added in
  2.1 ms, 1.3 ms GPU per frame for the whole scene with Philadelphia
  imagery; moving all 16,000 costs 1.6 ms CPU per frame, 320 scattered ones
  0.4 ms; moving the group is one `setTransform`. The GPU tables read back
  identical to the CPU tables after adds, scattered and dense updates.
- Stale handles are inert: a removed draw's handle cannot touch the draw
  that reuses its slot.

**glTF 2.1 and 3D Tiles 2.0.** 3D Tiles 2.0 builds on glTF 2.1, so both
shape the scene model (glTF 2.1 is in development at Khronos, announced
June 2026):

- _External assets_, placed once or many times and loaded on demand,
  map onto shared assets (1) and instance ranges; a referenced asset placed
  many times becomes one record per primitive with one instance per
  placement. Deferred loads go through the request scheduler, so a large
  glTF 2.1 scene streams like a tileset; the `files` array is one more
  resolver in the content pipeline.
- _Node bounding volumes_ (box, sphere, capsule, cylinder, plane) feed
  culling and deferred loading as tile volumes do.
- _`KHR_node_visibility`_ (core in 2.1) is transform visibility (5).
- _Unique IDs_ name objects for picking, selection and saved state, beside
  feature IDs.
- _`DOUBLE` accessors and 64-bit GLB:_ float64 positions are split at
  decode into a float32 offset from a mesh origin; the GPU never sees them.
- _`KHR_mesh_quantization`_ (core in 2.1): see quantized storage below.

**Billboards, points and decals for vector rendering.** Vector tiles and
point clouds bring very large point sets to draw as billboards, and
polygons to drape as decals, all shaded programmatically:

- _Point expansion by vertex pulling._ A point set is a record whose
  points are streams in the arena (position offset from the transform,
  size, color, image rectangle, rotation, pixel offset); a billboard
  pipeline draws six vertices per point and expands each in screen space
  from `vertex_index / 6`. No per-point instance entries, no CPU work per
  point; culling is per record (tile), as vector renderers do.
- _Programmable shading._ Billboard and point styles are Slang material
  functions over the point's streams and feature properties (3D Tiles
  styling and vector-tile styles compile to them), evaluated on the GPU.
- _Collision and decluttering_ (labels) run as a compute pass over the
  points' screen positions.
- _Decals_ project onto the depth and feature-ID targets (the draping
  plan, after M3), so vector polygons and lines drape on terrain and 3D
  Tiles alike.
- Wide lines and polylines are expanded into quads the same way (WebGPU
  only rasterizes 1-pixel lines).
- _3D Tiles 2.0 vector tiles_ are a primary input (with 3D Tiles 1.1
  vector content, `3DTILES_content_gltf_vector`, as today's public data):
  the same point, line and polygon pipeline draws them.
- _Vector sources beyond 3D Tiles:_ PostGIS, GeoParquet and similar
  stores are where much vector data lives. A vector source interface
  (like `TileSource` for terrain) queries features by view (extent and
  level of detail) from a service (PostGIS behind MVT or GeoJSON
  endpoints, FlatGeobuf) or directly in the browser (GeoParquet through
  GeoArrow, decoded in workers into columnar buffers that upload as
  vertex streams without per-feature objects). Features keep stable IDs
  (primary keys) through picking, styling and updates, so edits can be
  written back to the source; the generational handles and scatter
  uploads already let one feature change without touching the rest. An
  example reads vectors from PostGIS or GeoParquet and draws them, then
  edits them (planned with the vector work).
- _Candidate: the Slug algorithm_ (glyphs and vector shapes rendered
  directly from their Bézier curves in the fragment shader, resolution
  independent, no atlases). The plan owner has a working prototype of a
  vector styling and rendering pipeline on Slug, driven by the 3D Tiles
  styling language with prototype extensions; it is to be evaluated for
  this engine (decals and vector tiles) when that work starts.
- _A general vector pipeline_ (r50, to design with the vector work). The
  point cull (`pointCull.wgsl`, `PointCuller`, `VectorLayer`) grew around
  points: a style compiles to WGSL functions that one kernel per point
  draw calls, with its own bind group layouts. Points, lines, polygons,
  b-reps and curves need one design that keeps both sides:
  - _Performance_: GPU-driven, per geometry kind (cull and list in
    compute, splat what's tiny, draw the rest indirectly), sharing the
    world's tables instead of a layout per kind.
  - _The styling language_: 3D Tiles styling and its successor (the
    vector style lab's `shape`, `model()`, `filter`, `scales`,
    `parameters`, and what comes next) compile to the same kernel
    interface for every kind, so a new expression or property is a
    compiler change, not a new pipeline.
  - _The binding budget_ ([gpu-limits-and-capacities.md](gpu-limits-and-capacities.md)): style kernels get a fixed slot (one
    group: the style's uniforms and its symbol resources), and feature
    data reaches them through the world's tables and arena, so a richer
    style never adds per-stage bindings. r50 only narrowed the point
    cull's world group to fit `base`; the refactor is still open.

**Designed for, built later.**

- _Quantized vertex storage on the GPU:_ positions as 16-bit values in
  the mesh bounds, octahedral normals, 16-bit UVs, decoded in the vertex
  shader (vertex pulling makes mixed formats free); about 2-3× less arena
  memory.
- _Arena pages:_ one vertex buffer runs into the device's largest storage
  binding (the viewer caps the arena at a quarter of it; mobile allows
  far less). The arena becomes several pages, with occasional compaction.
  Designed in [gpu-limits-and-capacities.md](gpu-limits-and-capacities.md) as slabs (r50).
- _Clusters (meshlets) and two-phase occlusion culling_ (Nanite, Bevy,
  Unity's GPU Resident Drawer) in compute, since WebGPU has no mesh
  shaders: ~128-triangle clusters built in the worker (meshoptimizer),
  culled by frustum, back-face cone and the previous frame's depth
  pyramid. Records gain a cluster range as they gained an instance range.
- _Compute skinning and morph targets_ into per-instance vertex streams:
  no extra per-pass cost (shadows, picking) and geometry a ray tracer can
  refit.
- _Animation by property path_ (`KHR_animation_pointer`): animatable
  state is addressable properties, not only node transforms.
- _i3dm_ into instance ranges; `addInstances` for application content.
- _WebGPU features as they land:_ subgroups (Chrome 134) for compaction
  without an atomic per item; immediates (Chrome 149-150) for the draw
  index; multi-draw indirect (experimental since Chrome 131) with bindless
  textures for one draw per pipeline. Compatibility mode (OpenGL ES 3.1)
  can allow no storage buffers in the vertex stage, which vertex pulling
  needs: a concrete reason the PoC targets core WebGPU only.
