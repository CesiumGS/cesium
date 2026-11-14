# GPU resource limits and capacities (r50, design)

**What this holds:** Device limits, capacities and how the engine sizes and reports them. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**What broke.** The first run on a Mac (Apple M-series, Chrome) failed at
device start. The point cull's pipeline layout binds 13 storage buffers in
the compute stage: 8 in `cull.world` and 5 in `cull.points`. Apple's
adapter allows 10. The engine asked for the adapter's maximum
(`GpuDevice.ts`) and nothing checked layouts against it, so a layout that
fit the development machine became the engine's floor without anyone
choosing it. The same audit found:

- **Sampled textures**: the opaque pass samples 18 and translucent 21,
  against the spec default of 16.
- **Fixed capacities**: materials (4,096), draws and transforms (16,384),
  clip blocks (2,048), point sets (64) and the arenas (64 + 32 MB) are
  fixed and throw when full. Instances are the only table that grows.
- **Imagery slices**: 256, because `maxTextureArrayLayers` was never
  requested.
- **Cesium World Terrain breaks during long loads**: each terrain tile
  allocates 2 materials, its own and a per-asset copy of the glTF default
  material. So the table fills at about 2,047 resident tiles while the
  512 MiB byte budget still has room. Then:
  - the upload leaks the slots it took (`uploadAsset` has no rollback);
  - the tile stays `failed` and is never retried;
  - nothing in eviction knows about material slots.

**What devices report** (web3dsurvey.com, read November 2026; percentages
of reports at or above a value):

| Limit                      | Spec default | Devices                                                                         |
| -------------------------- | ------------ | ------------------------------------------------------------------------------- |
| Storage buffers per stage  | 8            | ≥ 10 on 99% overall but 95% of Macs; ≥ 16 on 80% (30% of Macs)                  |
| Sampled textures per stage | 16           | ≥ 44 on 91%: about 9% report 16 (most of ChromeOS, a third of Linux)            |
| Largest storage binding    | 128 MiB      | ≥ 256 MiB on 98% overall but 74% of Android; a quarter of Android is at 128 MiB |
| Texture array layers       | 256          | ≥ 2048 on 99%                                                                   |
| Bind groups                | 4            | Exactly 4 on all Android and ChromeOS                                           |

**Two kinds of limit.**

- _Binding counts_ (storage buffers, sampled textures, samplers, bind
  groups per stage) are **code**: every `@binding` is written into the WGSL
  and the layouts. Adapting them to the hardware needs a shader and layout
  variant per tier, and only the variant on the developer's machine gets
  tested. Fewer, larger bindings cost nothing at run time (an offset add,
  the same memory traffic). So binding counts are **designed to a floor**
  and checked by a test.
- _Capacities_ (table rows, arena bytes, array layers, pool sizes) are
  **data**: a number given to `createBuffer`. They **grow** to a ceiling
  taken from the device, and a pool at its ceiling becomes **pressure on
  the residency budget**, not an exception.

**Tiers.** A few named tiers with a tested floor each, as Unreal's feature
levels, Filament's feature levels and Godot's Mobile/Forward+ renderers do.

- `base` = the spec defaults: 8 storage buffers, 16 sampled textures,
  16 samplers and 4 bind groups per stage, a 128 MiB storage binding and
  256 MiB buffers. Every pipeline fits it. `GpuDevice` still requests the
  adapter's capacity limits (binding size, buffer size, array layers),
  since those only change numbers.
- Higher tiers are opt-in, one measured win at a time (for example Apple's
  48 sampled textures for larger material arrays). Each comes with its
  fallback, and the `base` path stays tested.
- **No shader variants for binding counts.** Unreal and Unity compile
  variants per feature level; a web engine can't precompile per platform,
  and HypeHype (Aaltonen, REAC 2023) keeps one binding model on mobile.

**Checking the floor.**

- `limits: "base"` (`GpuDevice`, the `Engine` option, Dyno's
  `?limits=base`) creates the device with no raised binding-count limits.
  Any machine then shows what a low-end device would hit, as Unreal's
  Mobile Previewer and Unity's graphics emulation do.
- A unit test records every bind group and pipeline layout the engine
  creates (a recording fake device in Node) and checks each stage's
  counts against `base`. Pipelines with `layout: "auto"` are checked from
  their WGSL declarations (an upper bound).
- At run time a layout over the device's limits fails with a message
  that names the layout, the stage, the count and the limit, not Dawn's
  "invalid PipelineLayout".

**Fewer, larger bindings.** The industry converged on one big scene buffer
read at offsets: Unreal's GPUScene, Unity's BatchRendererGroup (one raw
buffer with metadata offsets; constant-buffer windows on GLES), HypeHype.

- The cull group's read-write outputs that are plain words (item list,
  batch counts, indirect arguments) become one buffer with sections at
  offsets in the cull uniform: 8 → 6 in `cull.world`.
- The lights' table and froxel lists become one buffer: 3 → 2 storage in
  the view group, so the translucent fragment stage goes 8 → 7.
- Packing records, transforms and instances into one read-only buffer
  with generated accessors is the next step if a pass needs more headroom.
- Sampled textures to 16 first through merges that need no new machinery:
  the two high-altitude aerial-perspective grids into one array, the two
  aerial-perspective volumes into one volume, night lights into the
  imagery array. Translucent's own three textures fit after material
  arrays (below).

**Growable tables.** One `GrowableTable` for every per-slot GPU table
(records, transforms, instances, materials, batches and their counts and
arguments, clip blocks, point sets), generalizing what instances do since
r48: start small, double by `copyBufferToBuffer`, rebind, re-record the
bundles that bake the bind groups (`World.tableGeneration`). The ceiling
is the smaller of the option, `maxStorageBufferBindingSize` and
`maxBufferSize` over the row size.

**Arena slabs** (replacing [transforms-and-instancing.md](transforms-and-instancing.md)'s "arena pages"). Bevy's mesh allocator
solved this for WebGPU: meshes go into _slabs_ suballocated with Aaltonen's
OffsetAllocator; a slab starts small and grows to a cap; oversized meshes
get their own buffer; draws batch per slab. Vulkan Memory Allocator and
D3D12MA use the same blocks-plus-suballocation model for raw memory.
Nanite's fixed pages with a page table need indirection that only works
inside one binding, so they don't get past the binding limit here.

- A slab holds a vertex buffer and an index buffer, each at most the
  device's storage binding size and a configured cap (256 MiB).
- A mesh's streams, its instances' streams and its feature table's columns
  live in one slab; a feature table used from two slabs is copied into
  each (rare: tables belong to one tile's content).
- The slab is part of the batch key. Each slab has its own draw group
  (group 1), set per batch like texture sets; ray casts dispatch per slab.
- A new slab opens only when the last one can't grow. An emptied slab
  (other than the first) is destroyed.
- The allocator becomes constant-time size classes (OffsetAllocator's
  scheme) instead of first-fit, which [tile-selection-and-memory.md](tile-selection-and-memory.md), "Memory management (open design question)" asked for if streaming
  fragmented it.

**Capacity in the residency budget.** Unreal's texture and Nanite streaming
pools are fixed-size pools sized by a scalability setting, admitting and
evicting by priority instead of failing.

- Each pool reports used and ceiling (`World.pressure()`): the largest
  fraction over the tables, the slabs' bytes and the imagery slices.
- Streaming treats pressure above a threshold (90%) like being over the
  byte budget: it evicts by its usual order and stops admitting uploads
  until there is room again.
- Allocation is **transactional**: an upload that fails releases everything
  it took. A tile that fails for capacity (`CapacityError`) returns to
  `unloaded` and is retried when selected again; bad content stays `failed`.
- Pools are sized by tier and quality setting, not only by device maximums
  (WebGPU has no VRAM query, so "as much as the device allows" isn't a
  safe default).

**Shared materials.** Material records are keyed by their content and
texture set, with reference counts (as Unity's SRP Batcher, Unreal's
material instances and Bevy's asset handles share them), and every world
has one glTF default material. Cesium World Terrain then needs about two
materials in total, and tiles that share a material can batch together.

**Material textures and bindless.** WebGPU has no bindless yet: the WGSL
group called its October 2025 work groundwork for bindless, and Chrome's
texture and sampler "lets" (desktop 146) are a step toward it ([risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0").
Before bindless, engines grouped textures into arrays by size and format,
or into a virtual-texture physical cache (the globe's imagery slices
already are one).

- A material's textures are **texture references** in its record: today an
  array (by size and format class) and a layer; with bindless, an index
  into a resource table. Shaders read them only through
  `materialTexture(ref, uv)`, so the bindless backend replaces that
  function and the allocator, and nothing else.
- Texture sets (one bind group per set) remain for textures that fit no
  class, as the fallback the bindless path also needs where it isn't
  supported.
- Photogrammetry and Google tiles use a few standard sizes, so arrays by
  class let their tiles batch together.

**Increments.**

1. Quick unblocks: shared materials and the world's default material,
   transactional uploads, retries after capacity failures, requesting
   `maxTextureArrayLayers`, a point-cull layout with only what it reads
   (a stopgap: the vector pipeline is to be generalized, [transforms-and-instancing.md](transforms-and-instancing.md)).
2. The `base` tier: the limits option, the recording-device layout test,
   readable layout errors.
3. Per-stage counts: textures to 16 (property textures only in the
   layouts of custom shaders that read metadata; the two high-altitude
   aerial grids, the two aerial volumes and night lights merged into
   arrays), cull outputs and lights packed. Custom shaders get what is
   left of the budget, and a shader over it fails with the layout error.
4. Growable tables and capacity pressure in streaming.
5. Arena slabs.
6. Material texture arrays behind texture references.

**Progress (r50).** Increments 1 to 4 are built and checked on an
M-series Mac (2.0 now starts there; it didn't), and so is 5 (slabs).
Increment 6 became the bindless seam (below): arrays by size class don't merge
draws here (a batch is one mesh already), and fitting textures to classes
would resample them or need a virtual-texture page cache.

- _1._ Point cull's narrow group 1 (`cull.pointWorld`: 8 storage, was
  13); shared, reference-counted materials with one glTF default per
  world (terrain: 144 draws on 6 materials, was 2 per tile);
  transactional `uploadAsset`, placement and `addDraw` (the draw-table
  and transform paths leaked point lists and slots); `CapacityError`,
  and streaming keeps a tile that hit it queued and evicts instead of
  marking it failed; `maxTextureArrayLayers` requested.
- _2._ `gpu/limits.ts`: tiers `base` (default), `minimum` and `adapter`,
  layouts checked as they are created with readable errors, Dyno's
  `/?limits=minimum`. `test/limits.test.ts` starts the engine on a
  recording fake device in Node (`test/fakeGpu.ts`) and checks every
  layout against `base`, `layout: "auto"` pipelines from their entry
  points' statically used WGSL.
- _3._ Sampled textures: opaque 18 → 13, translucent 21 → 16 (property
  textures only for metadata-reading custom shaders; night lights in the
  imagery array, a per-world `SlicePool` that grows by copy as layers
  join; aerial-perspective grids and volumes merged). Storage: lights and
  their froxel lists in one buffer; the cull counts visible items
  straight into the indirect arguments' instance counts, so the batch
  counts buffer is gone (`cull.world` 8 → 7). The Slang spike's cull
  port is regenerated with slangc 2026.21.
- _4._ Draws, transforms, materials, clip blocks and point sets start
  at 1,024 rows (64 point sets) and double up to ceilings from the
  device's binding size (`tableGeneration` tells outside binders);
  `World.pressure()`, and streaming evicts above 90%. 3,000 draws added
  to a live Viewer grew the tables twice and drew correctly.
  `test/world.test.ts` covers sharing, ceilings and growth.
- _5._ `scene/Slabs.ts`: a world's geometry in slabs of a vertex and an
  index buffer each, at most `min(maxStorageBufferBindingSize, 256 MiB)`
  (`WorldOptions.slabBytes`), starting at 16 + 8 MiB and doubling by copy
  (queued uploads flushed first); a new slab only when none can grow to
  fit, within the world's budgets (`vertexBytes`, `indexBytes`: now
  budgets across slabs, 1 GiB and 512 MiB by default, no longer capped by
  one binding; the Viewer's and the suite's 768 and 384 MiB). Everything
  a draw reads by arena offset is in its mesh's slab (`MeshHandle.slab`):
  streams, the directory, its instances' streams, point anchors and
  lists, and feature table columns (copied per slab, keyed by table and
  slab). Each slab has its draw group; bundles and the translucent pass
  bind a batch's slab (group 1 and index buffer, batches sorted by slab
  last); ray casts dispatch per slab into one hit buffer; point sources
  and model pools bind their points' slab (`World.vertexBufferOf`) and
  rebind on `tableGeneration`. An emptied slab past the first closes.
  A range larger than the cap (a point set of ten million, about
  280 MB) gets a slab of its own, made at its size at once with no
  doubling or copy, if it fits the device's binding and the budget, and
  is destroyed when its range is released; past the binding or the
  budget it fails with a `CapacityError` naming the bytes and the limit.
  The allocator stays first-fit for now (with growth and a free tail);
  size classes wait for a measurement of streaming churn ([tile-selection-and-memory.md](tile-selection-and-memory.md), "Memory management (open design question)").
  Checked: OSM Buildings over terrain under `?limits=minimum` (128 MiB
  bindings), the first slab growing 16 → 32 MiB; tests for slabs that
  grow, multiply and close, and for the budget's `CapacityError`.
- _Inspector._ Memory: the fullest pool (what streaming answers, against
  its 90%), each arena's slabs and allocated bytes against its budget,
  every table against its ceiling, distinct materials, imagery slices
  against what the pool may grow to, the GPU tables as grown. GPU: the
  limits tier, per-stage binding counts and capacities. The Viewer's
  settings choose the limits tier (the page reloads on it).
- _6, the bindless seam._ Texture references in material records,
  `World.textureRefs`, the one shader accessor and its guard test ([risks.md](risks.md), "Bindless textures: not in the PoC, designed for in 2.0").
  The Slang port mirrors it (`materialTextureRef`, `materialHasTexture`,
  its own `materialTexture`), and its default material tests presence by
  reference instead of by flag bit. Texture arrays stay deferred until a
  measured need (a translucent custom shader past 16 textures) or until
  bindless ships.
- _Found: the Slang spike's port is stale._ Since r48 the engine took
  point sets' and the depth prepass's stages (`vsPoints`, `vsDepth`) from
  a whole-shader override, which the M0-era port doesn't have; those now
  come from the built-in module (`caster`), and the page runs again. Its
  image check reads mean ΔE 35.7 (every pixel past 2.3): the port's View
  and shading predate the atmosphere, exposure and view-struct changes,
  so it renders garbage. A second hand-kept copy of a shader drifts; see the
  decision to make Slang the one source of engine shaders, and its
  migration ([shaders.md](shaders.md), "Slang-first, for real").
- _Found: custom shaders' translucent layouts over 16 (r50 on)._ The
  custom-shader page failed 22 of 51 cases from this increment on: the
  built-in translucent layout was exactly 16, and a custom shader's
  property textures (2) or texture uniforms add to it, 17–18. The
  `layout budget` test never made a custom shader's layouts. Now the
  moments are read-only storage textures in group 3 (their own limit, 4,
  unused by fragments otherwise), so translucency adds one sampled
  texture to the opaque layout's (the opaque depth): built-in 14, a
  custom shader has the opaque layout's room but one. The format is in
  the WGSL type, so RenderContext declares them (`momentBindings`); the
  16-bit zeroth moment is `rgba16float` (`r16float` can't be storage).
  The test now makes a metadata shader's and a two-texture shader's
  layouts. Behind it, the antialiased lists (31716f59e7) take `sample_mask` and
  `sample_index`, which count as inter-stage inputs: with a shader's
  named values `fsListSamples` read 17. `VsOut`'s draw, feature and
  instance are one flat `vec3u` (`ids`), so 9 locations, 4 named and 3
  built-ins fit. And the VEC2 offset/scale by hand case is `close` like
  the other offset/scale cases (one pixel a level apart). 51 of 51;
  translucency 8 of 8, its FLIP unchanged.
