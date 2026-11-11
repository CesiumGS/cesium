# CesiumJS 2.0 on WebGPU — Proof-of-Concept Plan

Branch: `cesium-2.0-webgpu-poc` (off `main` @ `587f52f1eb`, CesiumJS 1.146.0)

History is in git. Tags like "r23" in this document are old revision numbers, kept so references to them still make sense.

## 1. Goal

A clean-slate CesiumJS 2.0 engine, WebGPU-only, that:

1. **Streams 3D Tiles into a real geospatial context**: a globe with terrain and imagery, plus Google Photorealistic 3D Tiles, Cesium OSM Buildings, photogrammetry, and **CAD/BIM tilesets from Cesium ion** positioned on that terrain.
2. **Renders close to 1.x** when asked to, and is free to do better by default.
3. **Is measurably faster**, mostly in main-thread CPU time, steady-state allocations, and time from tile request to tile visible.
4. **Supports multiple viewports** (split views, multiple canvases, offscreen views) on one shared GPU device and one shared tile cache.
5. **Lasts**: an architecture that can absorb vectors, splats, point clouds, classification, styling, bindless and XR later without another rewrite.

The public API is open to breaking changes. 1.x serves two roles only: it is the **visual and behavioral oracle** we test against, and a reference for formulas and for hard-won heuristics (screen-space error, skip-LOD, lighting, atmosphere). It is **not** an architectural template.

### Non-goals for the PoC

- Entities/DataSources; Primitive/Geometry/Appearance
- 2D and Columbus view; widgets
- WebGL fallback and **WebGPU compatibility mode**
- CZML/KML/GeoJSON
- Underground and globe translucency
- Imagery draped on 3D Tiles
- Bindless textures (designed for, not built; §7.1)

---

## 2. Why 1.x is slow (performance hypotheses to verify, then beat)

These are hypotheses taken from reading the current engine. M0 instruments each one so we compare measured numbers, not assumptions.

| #   | 1.x behavior                                                                                                                       | Cost                                                                      | 2.0 answer                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| H1  | Every frame, primitives' `update(frameState)` rebuilds a command list; `executeCommands` walks it pass by pass (`Scene.js` ~L2779) | JS work and GC that grow with the number of visible draws                 | **Persistent render world**: draws are registered once and mutated only when dirty      |
| H2  | Per draw, `ShaderProgram._setUniforms` calls closures from `uniformMap`, then issues one GL call per uniform                       | Main thread dominated by driver calls                                     | Bind-group frequency tiers plus storage-buffer draw records                             |
| H3  | Log depth writes `gl_FragDepth` (on by default); multi-frustum is the fallback                                                     | Disables early-Z / Hi-Z                                                   | **Reverse-Z `depth32float`, infinite far plane**, single frustum                        |
| H4  | Derived commands (translucent, shadows, pick, classification, 2D) multiply state and draws                                         | Complexity and draw count                                                 | Passes are frame-graph nodes. Pipeline variants come from a cache key                   |
| H5  | Picking re-renders into a pick framebuffer                                                                                         | Extra frame of work per pick                                              | Feature-ID target written in the main pass, read back asynchronously                    |
| H6  | Main thread runs glTF processing, texture upload prep and much of the decoding                                                     | Hitches during streaming                                                  | **Worker-first content pipeline**                                                       |
| H7  | Each primitive gets its own vertex buffers and VAOs                                                                                | Bind churn; draws can't be merged                                         | **Geometry arenas** with vertex pulling                                                 |
| H8  | Shader programs compile synchronously when first seen                                                                              | Compile hitches                                                           | Async pipeline creation and warm-up                                                     |
| H9  | Globe and 3D Tiles stream through separate systems; the globe shader samples every imagery layer per fragment                      | Duplicated logic and budgets; fragment cost grows with layer count        | **One streaming framework**; imagery **composited per tile into a texture-array cache** |
| H10 | One `Scene`/WebGL context per viewer                                                                                               | Multi-view duplicates every resource and tile; browsers cap live contexts | **One device, many views**                                                              |

---

## 3. Architecture

```text
packages/next/                     (working name @cesium/next; TypeScript, ESM)
  src/
    gpu/        Device, capability tiers, allocators, PipelineCache, BindGroupCache,
                GpuTimer, device-loss recovery
    render/     FrameGraph, RenderWorld (draw records), ViewRenderer, passes/*
    compute/    per-view draw prep, culling, HZB, sort, mipgen, reductions
    shaders/    *.slang (materials/vertex/fragment) + *.wgsl (compute kernels)
    scene/      Engine, World, View, Camera, Lights, Sky/Atmosphere, Post
    streaming/  TileSource, tile table (SoA), SelectionPolicy, RequestScheduler, ContentCache
    tiles3d/    3D Tiles source: tileset.json, implicit tiling, content/{glb,b3dm}
    globe/      Terrain source (quantized-mesh), imagery sources, imagery array cache
    io/         WorkerPool, glTF parse, decoders (meshopt, Draco, KTX2/Basis, QM)
    math/       float64 vec/mat/quat (typed-array, out-param), Ellipsoid, Transforms
    picking/    async feature-ID/depth readback, GPU ray/height queries
  parity/       side-by-side harness (1.x WebGL vs 2.0 WebGPU), image diff
  bench/        scripted flythroughs + metrics capture
  test/         Vitest (unit) + Vitest browser mode / Playwright (GPU tests)
```

The package lives in the existing monorepo so the parity harness can import 1.x `@cesium/engine` directly. It shares **no runtime code** with 1.x.

### 3.1 GPU layer (`gpu/`)

- `Device.create()` is **async** and requires **core WebGPU** (request `core-features-and-limits`). Compatibility mode is out of scope: it defaults `maxStorageBuffersInVertexStage` to 0, which rules out vertex pulling.
- Optional features are grouped into **capability tiers**, each with a fallback:
  - `indirect-first-instance` (≈100% of adapters)
  - `timestamp-query` (dev/bench only: Chrome quantizes it to 100 µs unless a developer flag is set)
  - `texture-compression-bc`, `-etc2`, `-astc` (picks the KTX2 transcode target)
  - `shader-f16`
  - `float32-filterable`
  - `subgroups` (≈83% of Chrome adapters, ≈0% in Safari/Firefox today, so every subgroup kernel needs a portable path)
  - `clip-distances`
  - `dual-source-blending`
  - **immediates** (`var<immediate>` / `setImmediates`, shipping in Chrome 149–150, usable in render bundles)
  - **`TRANSIENT_ATTACHMENT`** for MSAA targets (Chrome 146+)
- **Limits** (r50, §13.15): binding counts per stage fit the `base` tier (the spec defaults), checked by a test; capacities (table rows, arena bytes, array layers) grow to the device's limits and press on the residency budget when full.
- Resources are typed handles with explicit ownership. `dispose()` also supports `Symbol.dispose`, so `using` works.
- **Allocators**:
  - Geometry arenas: 64–256 MB chunks managed by an offset allocator such as TLSF.
  - A per-frame uniform ring.
  - Uploads start with `queue.writeBuffer`, which already stages internally. A custom staging ring gets built only if benchmarks show a win.
- **PipelineCache**: the key is (module, specialization, layout id, blend/depth state, target formats, sample count). Pipelines are compiled async; draws whose pipeline isn't ready are skipped rather than stalling the frame.
- **Device loss** is first-class. WebGPU has no VRAM budget query, so exhausting memory shows up as device loss. Recovery re-creates the device and replays resources from CPU sources or the cache. Memory budgets are heuristic and adapt after a loss.

### 3.2 Engine / World / View: multiple viewports

```text
Engine (1 GPUDevice, PipelineCache, ContentCache, RequestScheduler, WorkerPool)
 ├─ World A (terrain, imagery, tilesets, lights, atmosphere)   ← shared by views
 ├─ World B (optional)
 └─ Views[] — each: camera, target, viewport rect, layer mask, render settings
      targets: a canvas | a sub-rect of a canvas | an offscreen texture
```

- **One device for all views.** Geometry, textures, pipelines and the tile cache are shared across canvases. 1.x duplicates them per viewer.
- **Multi-view-aware tile selection** (details in §3.7):
  - Each view gets its own selected-tile set.
  - Loads are deduplicated and ordered by combined importance.
  - Tiles are pinned for as long as any view uses them, tracked as a **last-used frame per view** so views that render on demand at different rates don't evict each other's tiles.
- **Per-view render state**: camera block, culling output, frame-graph instance, transient targets sized to its viewport, layer mask, debug modes.
- **Limited render-target configurations.** Render bundles are keyed on (color formats, depth format, sample count). Views pick from a small fixed set of target configurations so bundles stay shared. Post-processing differences are free, since they happen after the bundles run.
- **View-agnostic render bundles** (confirmed valid by the review):
  - Bundles bind a "current view" uniform buffer and reference shared indirect-args buffers.
  - Per view, inside one encoder:
    1. `copyBufferToBuffer` copies that view's camera block into the "current view" buffer.
    2. That view's cull and prep compute pass writes the shared indirect args.
    3. The view's render passes run.
  - This works because commands in one encoder execute in order. `queue.writeBuffer` per view would race.
  - All views' compute is encoded up front where possible, giving the driver room to overlap. WebGPU has **one queue and no async compute**.
- **Linked views** are a first-class concept, not app code. A `ViewLink` connects a source view to a target view with one of these modes:
  - **mirror**: same camera, as in side-by-side comparison.
  - **follow**: target camera = f(source camera), as in an overview map that tracks the main view.
  - **footprint**: the target view draws the source view's frustum footprint on the ground.
  - **control**: input on the target drives the source camera, as in clicking the overview to fly the main view.

  Links are evaluated once per frame, before traversal, so linked views select tiles from consistent cameras. Camera controllers are separate modules attached to views, so a link can reroute input without view-specific code.

- **XR**: two views sharing traversal works now. The draft `view-instancing` proposal (`viewCount`, `view_index`) is the future path, so the View abstraction must allow a pair of views to collapse into one layered pass.
- **API**:

  ```ts
  engine.views.add({
    target: canvas,
    viewport: { x, y, width, height },
    world,
    camera,
  });
  ```

### 3.3 Render world and draws (`render/`): GPU-driven from M1

**Draw records.** RenderWorld stores draws in SoA tables mirrored to GPU storage buffers. Each record holds:

- tile origin (float64 split hi/lo)
- model matrix (float32, tile-local)
- bounding sphere, plus a horizon-culling point for globe tiles
- material index or `TextureHandle`
- arena offsets
- feature-ID base
- imagery array slice
- flags

**Records below tile granularity.** Large CAD/OSM tiles are split by node or primitive bounds, so culling works below tile level. This is the useful lesson from Nanite without adopting its cluster DAG (§3.11).

**Steady state.** Draws are added on upload, removed on eviction, and flagged dirty on change. **Zero steady-state allocations is a CI gate from M1.**

**Precision: camera-relative, computed once in compute.**

- A per-view **draw-prep compute pass** computes `(tileOriginHi − camHi) + (tileOriginLo − camLo)` for every visible record and writes the result as float32. Vertex shaders only see small numbers.
- WGSL lets compilers reassociate and fuse arithmetic (to verify against the spec), and Dawn uses relaxed math on macOS. The subtraction therefore runs in **one place, written so the compiler can't fold it** (integer-assisted if needed, as luma.gl does on Apple GPUs).
- It gets a **dedicated precision test on Metal/Safari in M0**.
- **Measured on Metal (r50): the float form failed.** On an M-series Mac
  (Chrome, Dawn's Metal backend) `spikes/precision.html` read the hi/lo
  path's error equal to plain float32's at every site and distance
  (0.25 to 0.47 m): relaxed math folded the split back. The fix is the
  integer-assisted form, everywhere (one path, tested on every machine,
  not a Metal-only branch): the CPU splits each coordinate with a high of
  whole meters (`splitHigh`; every float32 from 2^23 up is already an
  integer, valid to ±2^31 m), and shaders subtract the highs as `i32`
  (`hiLoDifference` in common.wgsl: `vec3f(vec3i(aHi) - vec3i(bHi)) +
(aLo - bLo)`), which no float reassociation can touch. Its cost is a few
  integer operations per draw item in the cull kernel, not per vertex.
  After: 0.04 µm at 1 m, 30 µm at 1 km, 3.8 mm at 100 km, as on D3D12.
- **Kept that way structurally (r50).**
  - Shaders reach split values only through two helpers:
    `hiLoDifference` (an offset between positions) and `hiLoSum` (a
    coarse absolute position, about 0.5 m at the Earth's radius, for
    directions from the center or altitude).
  - `test/precision.test.ts` fails on any other arithmetic on hi/lo
    fields in WGSL, WGSL in TypeScript, and the Slang ports, and on any
    CPU split written outside `splitVec3`/`splitHigh`.
  - The precision page has a bound (1.5e-7 × distance + 1 µm) and fails
    past it, so `npm run bench -- precision` catches a regression on each
    platform it runs on.
  - Planned with Slang materials: a `SplitPosition` type in a module with
    private hi/lo fields and the two helpers as its only operations, so
    material code can't misuse the parts (WGSL has no access control; the
    test covers the hand-written kernels).
- **Compared with other engines (r50).**
  - Unreal 5's Large World Coordinates keep float64 on the CPU and a
    tile-plus-offset pair on the GPU, with a camera-relative
    ("translated world") frame per view. That is this design, its tile
    the whole meter.
  - Unity and Godot (double builds) and 1.x for models, tilesets and
    terrain compute camera-relative matrices on the CPU in float64. It is
    exact, but every transform's matrix is re-uploaded per view per frame
    as the camera moves, which the GPU-driven cull avoids.
  - 1.x's per-vertex split (`EncodedCartesian3`, highs in multiples of
    65,536 m; `czm_translateRelativeToEye`) is for billboards, labels,
    points, polylines and primitives. It uses the same float form that
    failed here.
  - What this leaves open: vector data whose single draw spans a
    continent (one origin isn't enough for its vertices). There we need
    local origins per chunk at load, as tiles have, rather than a
    per-vertex split: half the bandwidth, and the same one subtraction
    site.
  - WebGPU has no float64 in shaders. An emulated 64-bit fixed-point
    position (two `u32` with carry) would be exact everywhere, but it
    isn't needed while offsets reach the GPU only through this
    subtraction.

**Bind group tiers.** Group 3 is draw data; immediates are used when available.

- `@group(0)` view: camera, sun, atmosphere, exposure
- `@group(1)` pass: OIT targets, shadow maps later
- `@group(2)` material: textures and samplers for textured tiles
- `@group(3)` draw records and material table (storage buffers)

**Per-draw index.** `instance_index`, populated through `firstInstance` in the indirect args.

- Without `indirect-first-instance`, a non-zero `firstInstance` turns the indirect draw into a **silent no-op**, not an error.
- The fallback is always compiled in: an instance-step vertex attribute whose buffer offset selects the draw index. It also works inside bundles.

**Material table.** Untextured materials, which is most of CAD/BIM, live in a storage-buffer table, so thousands of parts share one pipeline and one bind group. Textured materials reference a `TextureHandle`:

- Today it resolves to a per-material bind group baked into the tile's bundle.
- When WebGPU resource tables ship, it resolves to a table index without changing callers (§7.1).

**Submission from M1.** M1 already uses per-tile `GPURenderBundle`s with `drawIndexedIndirect`, and a trivial compute kernel writes the args. Later milestones only make the kernel smarter (frustum → horizon → occlusion). No milestone is built on CPU-encoded direct draws that would later need a rewrite.

**Measure early.** Dawn may insert an indirect-args validation pass on D3D12/Vulkan. M0 measures that overhead.

### 3.4 Shaders: Slang as the one source, WGSL where it must be, a WGSL-level user contract

**Why decide now.** The user-facing shader contract is public API.

**What Slang gives us**:

- Interfaces and generics for "engine pipeline + user material"
- Specialization constants → `override`
- `ParameterBlock` → one bind group
- Multi-target output (WGSL, SPIR-V, HLSL, Metal, GLSL)
- Khronos governance

**Gaps in Slang's WGSL backend today**:

- no wave/subgroup intrinsics
- no `SV_PrimitiveID`
- no `SV_ClipDistance`
- no pointers to struct fields
- 32-bit integer atomics only

**Model:**

1. **Material, vertex and fragment code is authored in Slang** and compiled to WGSL at build time.
2. **Compute kernels may be hand-written WGSL**: sorts and reductions that use subgroups, and CAD edges that need `primitive_index`.
3. **The user contract is specified as a WGSL-level ABI**: struct layouts and entry-point signatures for `IMaterial`, `IVertexModifier`, `IFeatureStyle` and `IPostEffect`.
   - Slang is the first-class authoring language for it.
   - Raw WGSL and generators such as three.js TSL-style node systems can target the same ABI.
4. **User shaders are compiled offline** (CLI or bundler plugin, recommended), or at runtime by a lazily loaded Slang WASM compiler in a worker, cached by hash.

**M0 spike checks.** If they fail, the fallback is WGSL with WESL modules behind the same ABI:

- generated WGSL validates in Chrome, Safari and Firefox
- PBR and globe shaders run within ~5% of hand-written WGSL
- `ParameterBlock` group numbering fits the 4-group limit
- `instance_index` semantics are preserved
- `override`-sized workgroup arrays work on Safari
- generated code passes Tint's uniformity analysis (non-uniform `textureSample` is rejected)
- generated arithmetic doesn't break the hi/lo precision path
- WASM compiler payload size and cold/warm compile latency are measured
- the output is readable enough to debug
- the license is reviewed

**Slang-first, for real (r50: decision and migration).** The model above
says engine material, vertex and fragment code is authored in Slang. In
practice every engine shader grew as hand-written WGSL: 26 files, about
7,800 lines, `opaque.wgsl` alone 1,451. The Slang spike's M0-era port
became a second copy that nobody kept in sync. By r50 its `View` had 19
of the engine's 26 fields and its `DrawRecord` lacked five, so it
rendered garbage, and the page had failed outright since r48 (§13.15).
Two copies of a shader drift. The fix is one source, Slang, with WGSL
generated from it, not a better-kept copy.

_What one Slang source buys, from this revision's own problems:_

- **Layouts in one place.** Structs are defined once in Slang. The
  TypeScript offsets (`render/layout.ts`) come from Slang's reflection
  (`-reflection-json`), and so do the bind group layouts and the binding
  budget test, which today reads WGSL with regular expressions.
- **Types that refuse mistakes.**
  - A `SplitPosition` with private hi/lo fields whose only operations are
    `difference` (integer-assisted) and `approximate`. Misuse is a compile
    error, not a test failure.
  - Types don't stop the compiler reassociating floats, so the integer
    form stays inside that type.
- **The bindless seam as an interface.** An `IMaterialTextures` with two
  implementations, a texture set per batch now and a resource table
  later, chosen at link time where today it's a WGSL function swap.
- **Materials as `IMaterial`** (the spike's model), with parameter blocks
  sized from reflection (the "generic material parameters" item below).
- **One language for the vector pipeline's kernels** (§13.9): a style
  compiles to an interface implementation, not to string-pasted WGSL.

_What stays WGSL:_

- **Kernels that need what Slang's WGSL backend lacks.** Subgroups (sorts,
  compaction), `primitive_index` (CAD edges) and clip distances stay WGSL
  until it has them, behind the same reflected layouts. None of today's
  shaders use them.
- **The user contract** (custom shaders, 3D Tiles styles, the vector
  styling language). Generators emit code at run time, and a style edit
  can't wait for an offline compiler. The contract stays a WGSL-level ABI
  (struct layouts, entry points, a few named helpers) that the generated
  engine WGSL exports under stable names. Runtime Slang through the
  lazily loaded WASM compiler stays an option, decided by its measured
  size and compile latency.

_Migration, in steps that each leave the engine working:_

1. **Re-run the M0 checks on today's Slang (2026.21) and today's
   features.** The checks above, plus what the engine now uses:
   `@builtin(sample_mask)` (`SV_Coverage`), flat interpolation,
   `override` constants sizing workgroup arrays, 32-bit atomics, 3D
   `rgba16float` storage textures, and exported names stable enough for
   the user ABI (Slang suffixes names, `records_0`). Gate: kernels within
   5% of the hand-written WGSL's GPU time, images within ΔE 0.5.
2. **The toolchain.**
   - `slangc` pinned to a release and fetched by `npm run setup`.
   - A Vite plugin compiles `.slang` imports to WGSL, cached by content
     hash.
   - The generated WGSL is checked in, so the library build and readers
     need no compiler, and CI regenerates it and fails on a difference.
   - Slang's line directives map shader errors back to the `.slang`
     source.
3. **Shared layouts.** `common.slang` becomes the source of `View`,
   `DrawRecord`, `Transform`, `Instance`, `Material`, `LightTable` and the
   cull structs. `common.wgsl` and the hand-kept offsets in `layout.ts`
   are generated from it. The layout budget test reads reflection.
4. **Kernels**, smallest and best tested first: scatter, pick, depthRange,
   cull (ported once already; checked by the precision page), pointCull,
   raycast, lights, imagery, adapt, ao, meter, composite, present, fxaa.
   Each is checked by its existing tests and pages before the WGSL file
   goes, and by the performance gate (`/#/lab/slang-kernels`: each port
   against the hand-written WGSL it replaced, timed and its outputs
   compared). **The gate and the probes have run only on an Apple GPU
   (Metal) so far: re-run both on Windows (D3D12, an NVIDIA and an AMD or
   Intel GPU) before the migration counts as done.** Slang's output
   reaches each backend's compiler through Dawn, and what costs time on
   Metal (a conditional write into a local array, loop shapes it won't
   unroll) may not be what costs it on D3D12, or the reverse.
5. **The surface shaders.** opaque and translucent on `IMaterial`,
   `IMaterialTextures` and `SplitPosition`, linked to run-time code
   through a declared boundary (_Step 5 design_ below). Checked by image
   regression in Dyno (§16.10), the parity pages and the custom-shader
   parity page.
6. **Sky and atmosphere** (`sky.wgsl`, `atmosphere.wgsl`,
   `reference.wgsl`), checked by their reference comparisons (§4.2).
   IBL's kernels and its Monte Carlo reference moved into step 4.
7. **Retire the spike.** Its port is the engine's source by then, and the
   page becomes a check that `ToonMaterial` links against it.

_Step 1 results (r53, Slang 2026.21, Apple M-series GPU on Metal)._ The
checks are a suite now: `spikes/slang/probes/*.slang`, compiled by
`node spikes/slang/probes.mjs` and validated in WebGPU by the probe page
(`/#/lab/slang-probes`). Re-run it on each Slang release; 13 of 16 behave
as expected today.

| Feature                                                    | Result                                                                                                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sample mask in and out, flat interpolation, instance_index | Works (sample mask through an output struct)                                                                                                              |
| 32-bit atomics                                             | Works through typed buffers (`RWStructuredBuffer<Atomic<uint>>`, `groupshared Atomic<uint>`); `InterlockedAdd` on a plain buffer isn't available for WGSL |
| Scalar `override` constants                                | Work (`[vk::constant_id]`)                                                                                                                                |
| Override-sized workgroup arrays                            | **Compiler crash** (E99999). None of the engine's arrays need it: theirs are const-sized                                                                  |
| 3D `rgba16float` storage textures                          | Work write-only (`WTexture3D`, `Store`); read-write isn't allowed for that format in WGSL                                                                 |
| Subgroups                                                  | **Work now** (`enable subgroups`); the M0 gap is closed                                                                                                   |
| `primitive_index`, clip distances                          | Still unsupported: CAD edges and clip planes would stay WGSL                                                                                              |
| Uniformity                                                 | Slang emits sampling as written; WebGPU rejects non-uniform `textureSample` as for hand-written code                                                      |
| hi/lo as a type                                            | `SplitPosition` (private parts, one `difference`) is bit-equal to the WGSL on 4,096 Earth-scale pairs (worst 0.49 mm); misuse is a compile error          |
| `ParameterBlock`                                           | One bind group each, in order                                                                                                                             |
| Matrices in buffers                                        | Stored as arrays of `vec4` and rebuilt element by element on each read (to measure in the kernels' timing)                                                |
| Names                                                      | Suffixed by default (`records_0`); entry points keep theirs. See the boundary below                                                                       |
| WASM compiler                                              | 24.1 MB; a custom shader in 1.9 s cold (worker and WASM load), 260 ms warm here (30–90 ms in the playground after a few compiles)                         |

**Names: the runtime boundary is declared in source, never rewritten.**
Code composed at run time (custom shaders, 3D Tiles and vector styles)
refers to engine names. Slang documents no naming guarantees, and its
maintainers advise against relying on emitted names (issue #8391), so
renaming its output with text manipulation is out.

- The boundary is marked `__extern_cpp` in the Slang source: the
  contract's value structs and their fields, the helpers runtime code calls,
  and the few bindings it reads. They keep their names, checked by the
  `boundary` probe.
- Two caveats apply:
  - `__extern_cpp` is documented only for the CPU target. Slang issue
    #14028 says same-named fields in different structs can merge (the
    probe checks they don't today).
  - The probe and golden tests of the generated boundary therefore guard
    every Slang upgrade, and the version stays pinned.
- Buffer-backed structs keep a layout copy (`View_std140_0`, fields named)
  and wrapped matrices. Runtime code never reads them directly: what it
  needs comes through the contract structs (as the custom-shader contract
  already does) or accessor functions.
- The engine calls functions the runtime code defines (the user's
  `vertexMain` and `fragmentMain`, a style's functions) by literal name
  through `__target_intrinsic(wgsl, …)`. That is internal Slang API, so it
  is kept to those call sites and tested the same way.
- Most kernels need none of this. The engine joins `common.wgsl` to each
  kernel as text today; with Slang each kernel's WGSL is self-contained
  (`import common;`), and the host binds it by group and binding number.
  Names matter only where code is spliced in at run time: the opaque and
  translucent surfaces, the point cull and the model pool.

_Step 2 started (r53)._

- `scripts/slangBuild.mjs` compiles each `.slang` under `src/` that has
  entry points to `src/shaders/generated/<name>.wgsl`, every entry point
  in it, plus its reflection (`<name>.json`). The output is checked in with
  a do-not-edit header.
- `npm run shaders` regenerates; `npm run shaders:check` fails on anything
  stale (for CI, which needs the pinned slangc).
- In dev a Vite plugin regenerates a `.slang`'s WGSL and its importers'
  on save; without slangc it says so once and the checked-in files serve.
- Scatter and pick are the first two kernels ported. They are identical in
  use, verified by the tests and by pick positions in the browser.

_Step 3 (r53): shared layouts._

- `shaders/common.slang` is the source of `View`, `DrawRecord`,
  `Transform`, `Instance`, `DrawItem`, `Material`, `LightHeader` and
  `Light`, their constants, the material texture references and
  `SplitPosition`.
- `layouts.slang` binds each struct the way the engine does, and the build
  generates `render/generated/layouts.ts` from its reflection: each
  struct's size, alignment and field offsets, formatted by Prettier so
  `--check` stays stable.
- `render/layout.ts` derives every size and word constant from it, and its
  writers address fields by name (`o + R.featureId`, not `o + 13`). The
  offsets match the hand-kept ones exactly.
- Until the last WGSL kernel is ported, `common.wgsl` stays for them, and
  `test/layouts.test.ts` computes its layouts with WGSL's rules and fails
  if any field or size differs from the Slang's. It was checked by swapping
  two fields, which it caught.
- The common structs are deliberately not `__extern_cpp`: several share
  field names (`flags` in four), which is the case Slang issue #14028
  warns about. Only the custom-shader contract's structs get it (step 5).

_Step 4 results (Slang 2026.21, Apple M-series GPU on Metal): every
kernel ported._ 35 cases on the gate (`/#/lab/slang-kernels`), each the
port against the WGSL it replaced (kept in `spikes/slang/reference/`),
dispatched alternately on the same synthetic inputs, timed by GPU
timestamps (Chrome rounds them to 65.5 µs, so each case repeats its
dispatch, 64 times by default), and compared element by element.

| Kernel                                                                  | Slang / WGSL | Outputs                                                          |
| ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------- |
| scatter, depthRange, lights, overlay, splat, imagery ×3, cull ×2, fxaa  | 0.99–1.03    | identical                                                        |
| raycast                                                                 | 1.00         | 28 within 1 ulp (dot products' order)                            |
| present: neutral, AgX with the eye, ACES                                | 1.00–1.02    | identical but AgX (1,353 within 1 ulp)                           |
| adapt.reduce: a workgroup a cell, bins summed in shared memory          | 0.72         | identical                                                        |
| adapt.blur: separable, in shared memory                                 | 0.33         | 136 within 1 f16 ulp                                             |
| meter: the bins' walk as a parallel prefix sum                          | 0.81         | 1 within 1 ulp                                                   |
| ao.gtao; ao.denoise from a shared tile                                  | 1.00; 0.97   | within the gate; 40 within 1 ulp                                 |
| composite: exact (sorted in a compute pass, per sample), moments        | 0.10; 0.93   | 7 within 1 ulp; identical                                        |
| ibl: sky, downsample, prefilter, shFinal, brdf                          | 1.00         | identical                                                        |
| ibl.shFace, its nine sums unrolled                                      | 0.89         | within 1e-6 (sums that cancel: many ulps near zero)              |
| ibl.irradianceCube, the source staged a face at a time in shared memory | 0.43         | identical (the same sums in the same order)                      |
| ibl reference (Monte Carlo)                                             | 0.99         | within 0.05 of sums up to 84, 1e-6 on average: see below         |
| points: applySamples, placePoints                                       | 1.00–1.01    | identical                                                        |
| modelPool: bin, claim, hide (with a style appended)                     | 0.98–1.00    | identical (claimed rows compared as a set: slots follow threads) |

What Slang's WGSL does that cost time, found by the gate, and what was
done:

- **Every loop is `loop { if (c) {} else { break; } … }`.** On Metal that
  shape with a small private array indexed by data (a histogram, a
  per-thread list) kept the array out of registers: the straight adapt
  port was 2.5× and the fragment-shader sort tens of milliseconds.
  Shared memory replaced them (above); `[ForceUnroll]` for loops over a
  constant count keeps their indices constant.
- **Every Slang loop pays Tint's loop guard (Chrome, Metal; found r59).**
  Metal treats an infinite loop as undefined behaviour, so Tint, writing
  MSL, guards every loop it can't prove finite with a 64-bit counter
  (`uint2 tint_loop_idx`: a decrement with carry, an `all()` test and a
  branch per iteration). Only a `for` with a counter and a constant bound
  is exempt; a `while`, a `for` to a uniform's count and every `loop {}`
  are guarded, and Slang writes every loop as `loop {}`. Where a loop's
  body is cheap it shows: the atmosphere's path tracer (ratio tracking: a
  `log`, a random number and a few multiplies a step) stayed 5% slower
  than its hand WGSL, whose two inner loops were constant-bounded `for`s
  and unguarded. Found by transplanting the hand WGSL's functions one at a
  time into Slang's output (the ratio-tracking loop alone took back the
  difference), then loop forms: the same body as a `for` was even, as a
  `while` or `loop { if … break }` 5 to 7% slower, wherever the exit test
  sat; Dawn's MSL (`scripts/dumpMsl.mjs`: Chromium with
  `--enable-dawn-features=dump_shaders,disable_symbol_renaming`) showed
  the guard. Nothing in Slang's source avoids it; `[ForceUnroll]` removes
  small constant loops altogether. Upstream, either fixes it: Slang
  emitting WGSL `for` for counted loops, or Tint recognizing a counted
  loop in `loop {}` form. To raise with both (and to check the other
  backends: Tint's HLSL and SPIR-V writers on Windows, step 4's runs).
  Two smaller lessons from the same kernel: `select(c, a, b)`, not `?:`,
  where the WGSL had `select` (Slang's `?:` is a branch, which rounded
  otherwise: paths drifted a few ulps), and `any(bool3(…))` over a `||`
  chain (Slang emits nested branches: 4 of the 11 points).
- **Large struct loads are split per field at each use** (deferred buffer
  loads): raycast was 30% slower until it read its draw record's fields
  once. **Stores too (r60):** a struct read, changed and written back
  (`Instance inst = rows[i]; inst.flags |= 1u; rows[i] = inst;`) becomes a
  load and a store per field, each with its own bounds clamp, where the
  WGSL's copy was one wide access: the model pool's `hideRest` (one flag
  bit) and `claimSlots` (three rows and a flag) ran 4 to 11% slower until
  they wrote only their fields (`rows[i].flags |= 1u`), now within 4%.
  Seen once their timings resolved: at 64 dispatches a pass these
  few-µs kernels were a timer step or two (Chrome's 65.5 µs), and read
  as even.
- **Matrices:** a `float3x3(...)` or `float4x4(...)` literal takes rows,
  WGSL's `mat3x3f(...)` columns; one read from a buffer is the same
  matrix in both (Slang stores it column-major for WGSL). Ports keep the
  literals verbatim and multiply as `mul(v, m)`, or transpose a column
  literal where it meets a buffer's matrix (the model pool). Grouping a
  product the WGSL's way keeps the rounding.
- **Tolerances** where a port can't be bit-identical: ulps for sums
  ordered or fused differently; an absolute bound for sums that cancel
  (SH coefficients near zero are many ulps from their twins while both
  are 1e-7 from the truth) and for the Monte Carlo reference, whose
  near-mirror sphere (roughness 0.05) turns a direction a rounding apart
  into a different point on the GGX peak (119 pixels by up to 0.02 of
  values to 84, 8e-4 relative).
- The gate itself: it flags outputs that are all zero (a case whose
  inputs never made its kernel write), and a GPU shared with other heavy
  work loses the device on the heaviest case (ao.gtao, which also
  happened at the commit where the whole gate had passed).

Still WGSL: only `surfaceVertex.wgsl`, by design (Slang emits no
`@invariant`).

_Step 6 results (r59): the atmosphere in Slang._ `air.slang` (a module:
the medium, the geometry, the tables' mappings and reads, the march),
`atmosphere.slang` (the tables and the probe), `sky.slang` (the sky-view
table, the sky from space, stars, the Moon, the sun-light table, aerial
perspective) and `reference.slang` (the Monte Carlo reference). The gate
(spikes/slangKernels.ts `ATMOSPHERE_CASES`): 15 of 15, every output
identical or within 1 ulp of f16, the probe within 1.1e-4 relative
(f32), all within 5% but the path tracer (7%, the loop guard above; an
offline reference, given 10%, stated in the gate). The reference path
tracer passes its own check against the CPU integral (|z| < 1.94); the
sky spike runs on them with its measures in range (the sky within 1% of
its tables' march, aerial perspective 1.8%, sunlight 1.1%); globe parity
passes and imagery's first view matches the previous run to the digit.

- **The aerial pass is two entry points, not a pipeline constant.** With
  its wavelength group a `[vk::constant_id]` constant, slangc ran for
  minutes and gigabytes on that one kernel; a generic's value parameter
  (`aerialColumn<let group : uint>`) makes each entry its own specialized
  copy. A plain function argument also compiled, but the first group's
  pass kept the second's reads and indexed the weights at run time: 40%
  slower.
- **Test inputs must be what the engine has.** With random tables the sky
  from space differed by up to 110 ulps of f16 and the probe by 5,540 of
  f32: a coordinate a rounding apart crosses a fixed-point filter weight's
  step, and between random texels that step is large. Made by the
  reference's own table passes, 1 ulp. Discontinuities (the horizon test,
  the rim's eight-ray average) flip on a rounding with random input too.
- **Small passes need many draws per timing:** Chrome quantizes
  timestamps to 65.5 µs, so a pass of a few µs drawn 64 times was 13%
  noise (cases now set `repeat`).
- **A varying `nointerpolation` struct passed whole** to a helper is
  copied with its `@interpolate(flat)` onto a struct WGSL forbids it on;
  fragment entries read such inputs by field (sky.slang `starFragment`).

_Step 7 results (r60): the spike retired._ Its port is the engine's
source: the spike's opaque shader, its `IMaterial` extension point bound
at link time and its cull kernel went (`spikes/slang.html`, its Slang
and build script, its lab and bench entries), and so did `common.wgsl`
(no WGSL kernel declares the shared structs any more; the layouts test
keeps the reflection's own checks). Materials in Slang reach the engine
through the custom shader contract instead (step 5): `ToonMaterial`, the
spike's user material (posterized base color, a rougher finish), is
`parity/slang/toon.slang`, a fragment stage, and the custom shader page
checks it links: compiled at build time and at runtime, it draws what its
WGSL twin draws, and differs from the default (54 of 54). Kept: the
probes (`spikes/slang/probes/`, re-run per Slang release, step 1) and the
gate with its references (`spikes/slang/reference/`): **the migration
still counts as done only after the gate and the probes run on Windows
(D3D12; an NVIDIA and an AMD or Intel GPU), and the loop guard (above) is
checked on Tint's other writers there.**

_To fix (r60): Snyk findings in the development tooling._ A scan of the
whole package (CLAUDE.md asks for Snyk on new code) found 17 issues, none
in the engine or in code the migration touched, all in tooling:

- DOM-XSS: parity pages' error tables (`parity/globe.ts`, `heights.ts`,
  `imagery.ts`, `lod.ts`, `selection.ts`) and the bench dashboard
  (`bench/suite/suite.html`, `views/Compare.tsx`, `Trends.tsx`,
  `Explorer.tsx` with `cesium1x.ts`). Text via `textContent` / DOM nodes,
  as `parity/translucency.ts` `fillTable` and `spikes/slang.ts` `report`
  already do.
- The dev server's file endpoints (`vite.config.ts`): paths from a
  request body read and written unchecked (path traversal), and error
  messages returned to the client. Resolve each path under its allowed
  root; return generic errors.
- An open redirect (`bench/suite/limitsTier.ts`); no rate limits on
  file operations (`bench/suite/frozen.mjs`, `vite.config.ts`); a
  hard-coded token flagged in `bench/suite/ionToken.ts`. On a
  localhost-only dev tool these may be false positives: say why in a
  comment where so, and rescan until only those remain.

_Step 5 design (decided): the surface shaders as a precompiled unit,
linked by name._ The custom-shader contract (`VertexInput`,
`FragmentInput`, …) can't be exported from the generated module as first
planned: its structs hold types each shader defines (`Attributes`,
`Metadata`, `InstanceValues`), which a module compiled ahead of time can't
name. So the engine's surface module is treated as an object file and
run-time code as a second unit, joined as a linker would, never by
rewriting the compiler's output:

- **The boundary is declared once, in Slang:** small fixed structs for
  the engine's side (a vertex, a fragment, their IDs), exported under their
  names (`__extern_cpp`); the functions the engine calls by name
  (`__target_intrinsic`: a vertex stage and a fragment stage the run-time
  unit defines); the helpers it exports (`readNamed`,
  `readFragmentProperty`, `readInstance`) and accessors for what styles
  read of the view (the camera, the view-projection, the anchor), not the
  `View` buffer's fields.
- **The build generates both sides from it:** the engine's WGSL (as for
  the kernels), a TypeScript description of the boundary from its
  reflection (fields, types, signatures; as `layouts.ts` is), and the
  Slang authors' contract (`cesium.slang`). `CustomShader.ts`, the 3D
  Tiles and vector styles and `slangStages.ts` generate the contract
  structs and the glue that builds them from the engine's, against the
  description. Golden tests check that the three agree.
- **Linking is joining plus a check:** before compiling, the host checks
  the run-time unit defines each function the engine calls, once, with
  the boundary's signature, and reports it in the author's terms.
- **Values passed from vertex to fragment** are packed into `vec4` slots
  (two floats and a `vec2` share one) and the generated module with that
  many slots is chosen: no `// @named` splice. Whether that is a module per
  count (0 to 4) or two (none and four) is measured first: unused slots
  may cost tile memory per vertex on Apple's GPUs.
- **Front ends:** styles keep their TypeScript expression compilers
  (WGSL, no Slang); WGSL custom shaders link as they are; Slang custom
  shaders are compiled offline (`scripts/slangShader.mjs`, the
  recommended path) or in the browser (`CustomShader.fromSlang`, the WASM
  compiler loaded lazily in a worker), now cached in IndexedDB by source
  and Slang version, so the compiler loads only when a visitor meets a
  shader not yet compiled. The engine itself never loads it.
- Switches inside the surface shaders stay `override` constants where
  they can (settled at pipeline creation, not compiled again); variants
  only where a struct or binding changes.
- **Measured (r55, Apple M-series, Metal):** a vertex-heavy pass (2
  million triangles of about a pixel, 4× MSAA) costs what the fragment
  stage reads, not what the vertex stage declares: four slots with one
  read cost the same as one slot with one read. Metal drops outputs the
  linked fragment stage doesn't read, so one module with four slots serves
  every pipeline, the engine's own included. To check on D3D12 and Vulkan
  (§3.4 step 4's Windows runs).

_Step 5 architecture: compilation units and a linker._ Composition is a
first-class step, not string joining spread through `RenderContext`:

- **A unit** (`ShaderUnit`) is WGSL with a name and its symbol table:
  what it defines (structs, functions, bindings) and what it uses from
  other units. Engine units are the generated surface WGSL, common
  structs and kernels' modules; run-time units come from front ends: a
  custom shader's stages, its generated contract and glue, its uniforms'
  bindings, a style's helpers. Symbols are declared, or read from the
  WGSL by a scanner of its top-level declarations (reading, never
  rewriting).
- **A boundary** (`Boundary`) names what one side exports and what it
  requires the other to define, with signatures: the surface shaders'
  (`cesiumVertexStage`, `cesiumFragmentStage`, the helpers, the fixed
  structs) is the first; the point cull's and the model pool's styles are
  others. Generated from Slang reflection once the surfaces are Slang;
  until then declared beside the WGSL.
- **A linker** (`Linker`) takes units and a boundary and gives a module
  or diagnostics: each required symbol defined exactly once, no name
  defined twice, signatures as the boundary says. Errors from the
  compiler map back to a unit and its own line (one table, from the
  link). Today's linker joins checked units in order; others can sit
  behind the same interface: Slang module linking where the compiler is
  loaded anyway, WESL-style imports, or WGSL linking if the language gets
  it.
- **Front ends** produce units: WGSL custom shaders as written, Slang
  ones offline (`scripts/slangShader.mjs`) or in the browser (the WASM
  compiler, cached), styles from their expression compilers. Pipelines
  are made from links, cached by the linked code.

_Step 5 progress (r56): the surfaces are Slang._ `surface.slang` (opaque
and translucent in one module, one compile for every pass) plus
`surfaceVertex.wgsl`, the three vertex entry points hand-written because
Slang emits no `@invariant`; they call `surfaceVertex`,
`surfacePointVertex` and `surfaceDepthVertex` across a second boundary
(`SURFACE_VERTEX_BOUNDARY`). Slang gives varyings locations in field
order (its `vk::location` doesn't reach WGSL, and semantics ending in a
digit are one semantic's indices, placed out of order), so a test checks
`VsOut` against every fragment entry point's inputs. `cutOutInDepth` is
pipeline constant `0` (`[vk::constant_id(0)]`). Custom shaders 51/51,
translucency 8/8, models, tileset and tracks pass.

- **Found by the linker:** Slang-compiled custom stages and the
  Slang-generated surface both carry Slang's synthesized names
  (`pixelOutput_0` from the stub's output); the link stopped it with
  both places named. The stub now has no outputs (it `discard`s), but two
  separately compiled Slang modules share one naming scheme, so a
  collision can come back with any synthesized helper.
- **Replaced (r57): `slangStages.ts`'s reading of Slang's output.** It
  found `vertexMain_N` and Slang's copies of the contract structs by
  pattern and stripped the `_N` suffix to match fields. Slang writes no
  symbol map, and `__extern_cpp` fixes the names of every struct it
  touches, so sharing contract structs between two compiles would emit
  them twice. What crosses now is only functions over built-in types:
  - _The boundary's description_ (`src/shaders/generated/boundary.ts`):
    the structs that cross, field by field with their WGSL types, from
    Slang's reflection of `surfaceBoundary.slang` (the engine's, through
    the reflection-only `boundary.slang`) and of cesium.slang (the
    contract's, compiled with empty named values). `shaders:check` keeps
    it current. Slang's reflection has no functions' signatures, so the
    functions stay declared in `shaders/link/boundary.ts`, checked against
    the generated WGSL.
  - _WGSL shaders:_ the contract's structs and stage glue are generated
    from the description (`scene/contract.ts` `CONTRACT_WGSL`): cesium.slang
    is their one source, and a field it adds must be one the engine
    passes.
  - _Slang shaders:_ compiled with a bridge (`slangBridge`):
    `cesiumSlangVertex` and `cesiumSlangFragment`, `__extern_cpp`, whose
    parameters are the contract's fields and named values flattened
    (built-in types only, named values sorted by name). Slang's output is
    used as it is; `CustomShader` finds the bridge in its symbol table and
    adds the WGSL side (`slangAdapter`; outputs through variables of their
    own, WGSL forbidding aliased pointer arguments) and a boundary for its
    signatures (`slangBridgeBoundary`: a shader compiled against other
    named values fails the link, named). Uniform bindings are read from the
    units' declarations, not matched in their code.
  - _Still open:_ a `SlangLinker` (one compile with `surface.slang`) stays
    an option behind `Linker`, for when a compile per shader of the whole
    surface is affordable (with the IndexedDB cache).
- **Done (r58): browser-compiled Slang cached in IndexedDB**
  (`scene/slangCache.ts`, database `cesium-slang`). The key is a SHA-256
  of everything the compile reads: the pinned Slang release
  (`scene/slangVersion.ts`, also slangTools.mjs's), the compiler's URL,
  the `cesium` module for the shader's declarations (given uniforms by
  type only), the shader and its bridge. A hit returns the WGSL and the
  shader's own uniforms without starting the worker, so the WebAssembly
  build isn't fetched: on the custom shader page's second visit no Slang
  worker started, 51/51. At most 128 entries, least recently used first
  out. `fromSlang({ cache })` takes `false` or any `SlangCache`
  (`memorySlangCache`). Where IndexedDB or digests are missing (private
  windows, insecure contexts) or an operation fails, shaders compile as
  without it. A compiler served at the same URL but changed isn't seen;
  the release in the key is the engine's, not the served build's (that
  needs the compiler loaded to ask).
- **Later (with the 2.0 package's tooling): ahead-of-time Slang for
  apps.** `scripts/slangShader.mjs` is the package's own script. Apps
  that don't want the WASM compiler need it published: a CLI in the
  package (`npx @cesium/next slang …`) and a Vite/Rollup plugin turning
  `import shader from "./x.slang?cesium"` into `CustomShader` options,
  with the same compile as `fromSlang`, pinned to the engine's Slang
  version (the contract is versioned with it). Its output must link
  against the engine version it runs on: the boundary's description,
  carried in the output and checked by the linker, says so in the
  author's terms rather than as a WGSL error.

_Explore when the surface shaders move (step 5): runtime Slang for the
user contract._ Today 3D Tiles styles, the vector styling language and
`CustomShader` generate WGSL strings against the WGSL ABI
(`FeatureStyle.ts`, `VectorStyle.ts`, `CustomShader.ts`). The
alternative is to generate Slang: styles become implementations of a
style interface, custom shaders link as modules, and the WASM `slangc`
compiles them in a worker (as `CustomShader.fromSlang` and the Slang
playground already do, §13.12). Compare the two on:

- **Latency:** compile time per style edit, cold (loading the 10 MB
  build) and warm. The playground shows it on every edit.
- **Payload:** the WASM build, when it is loaded, and whether it can be
  lazy only for pages that compile.
- **Errors:** messages and line mapping for a style author against what
  WGSL generation reports.
- **Capability and safety:** generics, interfaces and type checking of
  user code against the engine's types, versus string templates.
- **Speed:** GPU time of the generated code for the same style.
- **Reach:** pages without the WASM build (the library standalone, CSP
  without `'wasm-unsafe-eval'` in workers).

The answer may differ by user: styles and the vector language could
compile to Slang offline in their tooling, while `CustomShader` keeps a
WGSL path for pages that must not load the compiler.

_Open:_ how stable exported names are across Slang releases (the user ABI
depends on them); whether generated code passes Tint's uniformity
analysis at the surface shaders' size; the WASM compiler's size, for
runtime user Slang.

**Engine foundations for user shaders (r28; built in the PoC, milestone
"Custom shading").** The r28 spike state: `ShaderOverrides` swaps the
whole opaque module for the whole engine, and the Slang spike links one
`IMaterial` into it at build time. User shaders per tileset, model or
style need:

1. _Shader identity in the batch key and an async pipeline cache._ Batches
   key on mesh, material, texture set and cull mode, and the pipeline
   follows topology and sidedness only. The key gains the shader; pipelines
   are cached by shader hash × variant (cull mode, topology) × pass and
   compiled asynchronously, so content shows when its pipeline is ready and
   compiling never stalls a frame.
2. _A vertex attribute directory._ Records have six fixed stream slots.
   1.x `CustomShader` reads any glTF attribute (`_TEMPERATURE`), and point
   clouds and vector billboards need named attributes too: a per-mesh table
   of (semantic, stream offset, format) replaces the slots, read by a
   generated accessor per attribute.
3. _Generic material parameters._ The material table is the fixed 64-byte
   glTF PBR struct. User materials get typed parameter blocks (layout from
   Slang reflection) in a parameter buffer addressed per material, and
   texture sets with as many slots as the material declares (a bind group
   layout per material type, Slang `ParameterBlock` → group 2). glTF PBR
   becomes the default material type.
4. _Pass variants from one module._ Opaque, pick, depth-only and later
   shadow and translucent pipelines compile from the same user code, so a
   vertex modifier moves geometry the same way in every pass. A vertex
   modifier declares its displacement bound, which pads culling bounds;
   ray queries see undeformed geometry until compute skinning exists
   (§13.9).
5. _A versioned `cesium` Slang module as the public contract:_
   `SurfaceInput`/`Surface`, attribute access, per-instance streams,
   feature IDs and feature-property lookup (for `IFeatureStyle` and 3D
   Tiles styling), view and lighting inputs. Raw WGSL can target the same
   ABI.
6. _Runtime compilation_ by the lazily loaded Slang WASM compiler in a
   worker, cached by source hash; build-time compilation (CLI or bundler
   plugin) stays the recommended path. Errors surface asynchronously and
   the content draws with the default material meanwhile.

Compared with 1.x `CustomShader` (GLSL snippets `vertexMain` and
`fragmentMain`, uniforms, varyings, a lighting model, for `Model` and 3D
Tiles): the same capabilities, typed and checked at compile time, one
material per batch instead of per primitive draw command, and the same
module drives every pass. A migration guide maps `vsInput.attributes`,
`fsInput.features` and `czm_` built-ins to the `cesium` module.

### 3.5 Frame graph

Passes declare their reads and writes. The graph sorts passes, allocates transient targets per view (aliasing where lifetimes allow), and makes passes an extension point for shadows, classification, SSAO and CAD edges.

Per-view frame:

1. **Uploads and compositing**: imagery into array-cache slices; compute mip generation.
2. **Draw prep and cull (compute)**:
   - camera-relative offsets
   - frustum and horizon culling (M1–M3)
   - **two-phase occlusion culling** (M5, optional): draw last frame's visible set, build the HZB, test the rest, draw newly visible. Single-pass previous-frame HZB is ruled out because it leaves holes during camera motion.
3. **Opaque**: globe, then 3D Tiles, sorted front to back. No depth prepass by default; measure overdraw first.
   - **Color**: `rgba16float` HDR **by default** (tonemapped in post), or `rgba8unorm-srgb` in an LDR per-view option. The LDR mode is kept for comparing against 1.x's out-of-the-box defaults.
   - **Feature ID**: `rg16uint` holding a 32-bit ID as (lo16, hi16). _M0 finding: WebGPU does not allow multisampled `r32uint`; `rg16uint` multisamples fine._
   - **Depth**: `depth32float`, reverse-Z
   - **MSAA 4×**, with the MSAA color target as a `TRANSIENT_ATTACHMENT` where supported.
   - **Integer targets can't be MSAA-resolved.** The feature-ID target is resolved by a **custom sample-0 resolve inside the pick-readback pass**, only for the requested region.
4. **Sky / atmosphere** after opaque. Fog and atmosphere linearize reverse-Z depth.
5. **Translucent** (clean-slate design; 1.x is not the reference, see r9/r10): a **unified compute translucency compositor** shared with Gaussian splats (§3.6). Translucent mesh fragments go into per-pixel linked lists in the fragment stage; splats are radix-sorted on the GPU and binned into screen tiles; one compute resolve merges both depth-ordered streams per pixel and composites front to back over the opaque depth, with early termination at full opacity. **Moment-based OIT** is the bounded-memory fallback when a pixel's list overflows. The exact (unbounded, sorted) resolve doubles as the ground-truth reference for tests. WebGPU has no fragment interlock.
6. **Resolve and post**:
   - Exposure and tonemapping by default. The tonemapper matches 1.x's HDR tonemapper for parity; auto-exposure via a compute histogram comes later.
   - Pass-through in LDR mode.
   - FXAA.
7. **Async readback** for picks and height queries. `mapAsync` latency is 1–3 frames, which the API exposes as a promise.

### 3.6 Compute shaders: where they pay off

| Area                        | Compute use                                                                                                                                                                                                                                                         | Win over 1.x approach                                                                                                    | When                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| Draw prep                   | Per-view camera-relative offsets and args writing                                                                                                                                                                                                                   | Precision handled in one place; enables GPU-driven draws                                                                 | M1                       |
| Culling                     | Frustum + horizon (M1–M3); two-phase HZB occlusion (M5)                                                                                                                                                                                                             | CPU culling and draw-list building go away                                                                               | M1→M5                    |
| Imagery                     | Composite N layers and reproject Web Mercator → geographic into **`texture_2d_array` cache slices**                                                                                                                                                                 | One texture fetch per fragment; one bind group for the whole globe                                                       | M3                       |
| Atmosphere                  | 1.x scattering model precomputed into LUTs; dynamic environment map → spherical harmonics by parallel reduction                                                                                                                                                     | Per-pixel scattering becomes a LUT fetch                                                                                 | M4                       |
| Mips                        | Compute mip generation                                                                                                                                                                                                                                              | No render-pass-per-level mips                                                                                            | M1                       |
| Picking and queries         | Ray/height queries (`sampleHeight`, clamp-to-ground, drill pick); feature-ID sample-0 resolve                                                                                                                                                                       | Batched and async, with no re-render                                                                                     | M2–M3                    |
| **Gaussian splats**         | Cull + 3D→2D covariance projection + spherical-harmonics evaluation → **GPU radix sort**, a portable wait-free variant without subgroups or global atomics (WebSplatter, 2026) plus a subgroup variant → indirect instanced draw. 1.x sorts in WASM on CPU workers. | CPU never touches splats; each view sorts independently                                                                  | M6                       |
| **Translucency compositor** | Per-pixel fragment lists (fragment-stage storage atomics) + splat tile lists → one compute resolve: per-pixel merge of the two sorted streams, front-to-back blending over opaque depth, early-out at full opacity; MBOIT fallback on list overflow                 | Correct ordering of glass, splats and opaque geometry together (1.x composites splats and translucent meshes separately) | M4 (meshes), M6 (splats) |
| **Point clouds**            | Compute rasterization with **32-bit atomics, two-pass** (depth min, then color where depth matches), because 64-bit atomics are only a draft proposal; EDL post-process as compute                                                                                  | Very large clouds without the triangle pipeline                                                                          | M6                       |
| Styling                     | Compiled style → per-feature color/show buffers                                                                                                                                                                                                                     | No CPU style evaluation                                                                                                  | M6                       |
| Post                        | Auto-exposure histogram, tonemap, FXAA/SMAA, SSAO, CAD edges                                                                                                                                                                                                        | Fewer full-screen passes                                                                                                 | M4+                      |
| Classification              | Compute decals, or per-pixel lists                                                                                                                                                                                                                                  | Replaces stencil volumes that need watertight geometry                                                                   | post-PoC                 |

Traversal, decoding of compressed formats and networking stay on the CPU in workers.

### 3.7 Unified streaming and tile selection (`streaming/`)

- A **`TileSource` interface** covers every hierarchical LOD source. **3D Tiles** and **terrain quadtrees** share:
  - one **tile table** stored as SoA typed arrays, transferable to workers. Using `SharedArrayBuffer` would need COOP/COEP headers, which many deployers can't set, so it isn't required.
  - one selection framework
  - one **RequestScheduler**: priority, cancellation, per-host limits, ion auth, and P3DT session semantics as a first-class feature
  - one **ContentCache** with an engine-wide budget and per-view last-used tracking
- **Imagery** is a dependent source keyed to visible terrain tiles.
- **`SelectionPolicy`** is pluggable:
  - **`Stepwise`** reproduces 1.x selection exactly (3D Tiles SSE 16 with REPLACE/ADD and request volumes; globe SSE 2 with horizon culling). It exists for **fair comparisons** and deterministic parity tests.
  - **`Budgeted`** (default) improves on it:
    - **Keeps 1.x's proven heuristics**: skip-LOD (the biggest win for deep photogrammetry trees), dynamic SSE, foveated SSE, progressive resolution, flight-destination preloading, and culling requests while moving.
    - **Budget-driven refinement**, formalized as Funkhouser–Séquin benefit/cost selection. Benefit = SSE reduction × screen weight × view weight. Cost = bytes plus decode milliseconds. When the budget is reached, quality degrades gracefully instead of thrashing.
    - **Multi-view priority**: the maximum across views decides pinning; the weighted sum across views orders bandwidth. iTwin.js (shared tile trees, per-viewport selection, one global request queue) is the closest shipped analogue to study.
    - **GPU feedback**: tile coverage from the HZB (pixels covered per tile) feeds importance, as a better signal than SSE alone. It also deprioritizes occluded tiles.
    - **Stability**:
      - hysteresis bands on refine and coarsen
      - no coarsening while a finer sibling is still loading
      - cross-fade or dither transitions, budgeting for the overlap of two tiles drawn at once
    - **Prediction**: prefetch along camera velocity.
    - **Off the main thread**: the tree walk runs in a worker over the transferable tile table.
- **Content decode** runs in the WorkerPool. The main thread only uploads, within a per-frame time and byte budget. That budget is the only lever, because uploads share the single queue with rendering.

### 3.8 Globe, terrain and imagery (`globe/`)

- **Terrain**:
  - quantized-mesh 1.0 with oct-encoded normals, watermask and metadata/availability extensions
  - Cesium World Terrain (ion 1)
  - smooth ellipsoid fallback
- **Imagery**: the ion default imagery, plus XYZ/TMS/WMTS sources. Web Mercator and geographic schemes are composited by compute into a **fixed-size `texture_2d_array` cache**. Each terrain draw record carries its slice index, so **the whole globe draws with one bind group** and is fully GPU-driven. A clipmap or sparse virtual texture is a later option for very high layer counts.
- **Globe rendering**:
  - camera-relative via draw prep
  - skirts for cracks
  - horizon culling in selection (float64, before fetching; r25)
  - shared depth with 3D Tiles
  - ground atmosphere and fog matching 1.x defaults
  - lighting off by default, with an option to enable it
- **3D Tiles in context**:
  - Root transforms, ion georeferencing, height offsets, and clamping via GPU height queries.
  - For CAD/BIM: the material table, sub-tile draw records, feature-ID picking with `EXT_structural_metadata`, and an edge pass as an M6 option (needs `primitive_index`, which is hand-written WGSL).

### 3.9 Tile content

- glTF/GLB with `EXT_mesh_features`, `EXT_structural_metadata`, `KHR_texture_basisu` (transcode target chosen per device tier), meshopt and Draco.
- **b3dm unwrap** (glb + batch table → feature IDs).
- i3dm, pnts and implicit tiling are stretch goals; pnts arrives with M6 point clouds.

### 3.10 Public API (intentionally breaking)

```ts
const engine = await Engine.create();                       // async; one WebGPU device
const world  = engine.worlds.create({
  terrain: await Terrain.fromIon(1),
  imagery: [await Imagery.fromIonDefault()],
});
const cad = await Tileset.fromIon(cadAssetId);
world.add(cad);

const main = engine.views.add({ target: canvasA, world, camera: Camera.lookAt(...) });
const plan = engine.views.add({ target: canvasA, viewport: { x: 0.7, y: 0, width: 0.3, height: 0.3 },
                                world, camera: Camera.topDown(...) });   // picture-in-picture

cad.events.on("tileVisible", ...);
const hit = await main.pick(x, y);                          // async, no re-render
const h   = await world.sampleHeight(cartographics);        // batched GPU query
```

Principles, each fixing a 1.x abstraction problem:

- **Async creation, no `ready` flags.**
- **No `update(frameState)` contract.** Objects register with the world, and mutations mark them dirty.
- **Explicit ownership and disposal** (`dispose()` / `using`).
- **Engine, World, View separation**, with N views per engine.
- **Core is DOM-free.** An `OffscreenCanvas`-in-worker smoke test runs from M0 to catch DOM leaks.
- **Typed-array math with required `out` params.**
- **Shader extension through a versioned WGSL-level ABI**, with Slang as the first-class authoring language.
- **UI and widgets live outside core.** Camera controllers are separate, replaceable modules.

### 3.11 Techniques considered and deferred

| Technique                              | Verdict                                                                   | Why                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibility buffer / deferred texturing | **No** for the PoC; revisit when bindless ships                           | The material pass needs access to every visible tile's texture, which bindful WebGPU forbids. It also fights MSAA. Overdraw is modest with front-to-back sorting.                                                                           |
| Meshlets / Nanite-style cluster DAG    | **No** cluster hierarchies in the engine                                  | 3D Tiles HLOD already provides streaming and LOD units. A cluster DAG is a tile-format question, not a renderer one. We take sub-tile draw records and GPU feedback from Nanite instead, and keep the draw-record format producer-agnostic. |
| Virtual texturing                      | **No** for 3D Tiles; the imagery array cache is a tile-aligned form of it | Per-tile photogrammetry textures gain nothing from repacking                                                                                                                                                                                |
| Multi-draw-indirect                    | **Opportunistic only**                                                    | Still behind an unsafe flag in Chrome                                                                                                                                                                                                       |
| Bindless                               | **Design for it; don't build it**                                         | §7.1                                                                                                                                                                                                                                        |

---

## 4. Parity strategy (1.x as oracle)

The harness is `parity/` side-by-side: a 1.x `Viewer` (WebGL) and a 2.0 `Engine` (WebGPU), driven by **one serialized camera state** and a fixed `JulianDate`, with the same assets and default settings. Parity runs use `Stepwise` selection. Color is judged on 2.0's exact sRGB pipeline, and translucency against 2.0's own exact reference mode rather than 1.x (r9). Because 2.0 defaults to HDR, the primary image baseline is **1.x with `scene.highDynamicRange = true`** and the same tonemapper. A secondary LDR-vs-LDR run covers 1.x's out-of-the-box default.

| Level                      | Check                                                                                                         | Pass criterion                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| L0 math                    | Ellipsoid/Transforms/Sun/projection vs 1.x; **hi/lo precision on Metal, D3D12 and Vulkan**                    | ≤1e-12 relative (CPU); bounded error in meters at canonical distances (GPU) |
| L1 selection (`Stepwise`)  | Selected 3D Tiles and terrain tile IDs after load settles                                                     | ≥ 99% Jaccard (target 100%)                                                 |
| L1′ selection (`Budgeted`) | Image error vs a fully refined reference; bytes downloaded; time-to-full-detail; popping with a static camera | better than `Stepwise` on most metrics and no worse on any                  |
| L2 image                   | NVIDIA FLIP mean / p95 vs 1.x screenshot                                                                      | mean ≤ 0.05, p95 ≤ 0.2 (tune in M0)                                         |
| L3 look-dev                | Swipe slider plus flicker toggle                                                                              | human sign-off                                                              |

Expected sources of drift, each tracked explicitly:

- sRGB placement
- MSAA resolve behavior
- reverse-Z vs log depth at far range
- ground atmosphere and fog
- default IBL
- `KHR_materials_unlit`
- imagery filtering after compositing

Canonical datasets:

- Cesium World Terrain (ion 1) with the ion default imagery
- Cesium OSM Buildings (ion 96188)
- **CAD/BIM tilesets hosted in Cesium ion**, chosen by the team (iModels can be tiled into ion)
- one photogrammetry b3dm tileset
- Google P3DT (ion 2275207)
- `Specs/Data` tilesets for offline CI

### 4.1 Extension coverage

What 1.x reads (its glTF loader and 3D Tiles code, r33) against 2.0
today. "Tolerated" means 2.0 loads the content but ignores the
extension, so it draws differently from 1.x; the benchmark suite matches
1.x to 2.0 where it can (render settings, §16.3) and the filmstrip shows
the rest. Status as of r33; milestones are where each is planned.

| Extension                                                                                                               | Used by                                             | 2.0                                | Milestone                       |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------- | ------------------------------- |
| `KHR_materials_unlit`, `KHR_mesh_quantization`                                                                          | photogrammetry, Google tiles, most tilers           | supported                          | done                            |
| `KHR_draco_mesh_compression`, `EXT_/KHR_meshopt_compression`                                                            | compressed meshes                                   | supported (worker decode)          | done                            |
| `KHR_texture_basisu`                                                                                                    | KTX2 textures                                       | supported (transcoded per device)  | done                            |
| `EXT_mesh_features`, `EXT_structural_metadata`                                                                          | features and metadata (3D Tiles 1.1)                | supported (vertex IDs, tables)     | done; textures/attributes M6    |
| `EXT_mesh_gpu_instancing`, `EXT_instance_features`                                                                      | instanced glTF, i3dm                                | supported                          | done                            |
| `CESIUM_RTC`, `3DTILES_batch_table_hierarchy`                                                                           | b3dm and legacy tilesets                            | supported                          | done                            |
| `KHR_texture_transform`                                                                                                 | atlased textures, CAD materials                     | tolerated (ignored, warns)         | M4                              |
| `CESIUM_primitive_outline`                                                                                              | OSM Buildings, CAD tilesets                         | tolerated (outlines not drawn)     | M4                              |
| `EXT_mesh_primitive_edge_visibility`, `CESIUM_3D_TILE_EDGES`                                                            | iTwin/CAD edges (Bentley content)                   | missing                            | M4 (CAD edges, §13)             |
| `KHR_materials_emissive_strength`, `_specular`, `_clearcoat`                                                            | PBR assets                                          | missing                            | M4                              |
| `KHR_materials_anisotropy`, `_pbrSpecularGlossiness`                                                                    | PBR and older assets                                | missing                            | M4                              |
| `KHR_node_visibility`, `KHR_/EXT_mesh_primitive_restart`                                                                | glTF 2.1-era assets                                 | missing                            | M4                              |
| `EXT_texture_webp`, `EXT_textureInfo_constant_lod`                                                                      | web-optimized textures, terrain-draped textures     | missing                            | M4                              |
| `3DTILES_implicit_tiling`, `3DTILES_subtree`                                                                            | large tilesets, point clouds, global data           | missing (warns)                    | M5                              |
| `3DTILES_multiple_contents`                                                                                             | layered tilesets                                    | first content only (warns)         | M5                              |
| `3DTILES_bounding_volume_S2`, `_cylinder`, `EXT_implicit_*_region`                                                      | global and cylindrical tilesets                     | missing (box, region, sphere only) | M5                              |
| `3DTILES_metadata`, `3DTILES_content_gltf` (1.0 extensions)                                                             | 3D Tiles 1.0 tilesets with 1.1 features             | missing                            | M5                              |
| `3DTILES_draco_point_compression`, pnts                                                                                 | point clouds                                        | missing                            | point-cloud milestone           |
| `KHR_gaussian_splatting` (and SPZ compression)                                                                          | Gaussian splats                                     | missing                            | splat milestone (§13)           |
| `CESIUM_mesh_vector`, `EXT_mesh_polygon`, `3DTILES_content_gltf_vector`, `MAXAR_content_geojson`                        | vector tiles and vector data                        | missing                            | vector milestone (§13)          |
| `CESIUM_3D_TILE_CLASSIFICATION` (and `_IGNORE_SHOW`, `_MASK`)                                                           | classification                                      | missing                            | after M6                        |
| `EXT_primitive_voxels`, `3DTILES_content_voxels`                                                                        | voxels                                              | missing                            | later                           |
| `KHR_implicit_shapes`, `AGI_articulations`, `NGA_gpm_local`, `EXT_geospatial_crs`                                       | collision shapes, articulated models, accuracy, CRS | missing                            | later                           |
| `KHR_techniques_webgl`, `KHR_materials_common`, `KHR_binary_glTF`, `WEB3D_quantized_attributes`, `EXT_feature_metadata` | glTF 1.0 and deprecated drafts (1.x upgrades them)  | missing                            | decide: upgrade on load or drop |

Of the 3D Tiles 1.0 content formats, b3dm and i3dm are supported; pnts,
cmpt, vctr and geom are not. The table is checked when a milestone closes, and
the benchmark catalog's scenes note which of these their content uses.

### 4.2 Lighting and shading: what matches 1.x, and what is judged against physics

1.x is the oracle for **what a scene says**: geometry, positions, time and
the sun, which content is shown, and the values a material or style carries.
It is not the oracle for **how light behaves**. Where 1.x shading is an
approximation or a workaround, 2.0 follows the physics and the glTF and
3D Tiles specifications and is judged against references; comparisons with
1.x there only check that a scene migrated with default settings still looks
like itself. Three tiers, each with its own test:

**Exact parity (L2 FLIP vs 1.x, as today).** Things that carry data:

- unlit content (`KHR_materials_unlit`), vertex and feature colors, styles,
  picking, and globe imagery with lighting off (1.x's default:
  `Globe.enableLighting` is false, so imagery shows its own colors);
- input decoding: sRGB vs linear textures, KTX2, quantization, normal-map
  conventions, alpha modes, double-sidedness, texture transforms. Tested
  through unlit and albedo debug outputs, so lighting can't hide a decoding
  bug;
- geometry and time: sun and moon directions from a `JulianDate` (L0),
  cameras, depth, clipping;
- direct sunlight with image-based lighting off (the parity harness's
  `direct` mode): the same glTF BRDF on both sides, so a difference is a
  bug on one of them (filed in §14 when it is 1.x's).

**Intent parity (statistics vs 1.x, not FLIP).** The default look of a lit
scene: average luminance of lit content within a third of a stop, sky
chromaticity at zenith and horizon, the dominant direction and ratio of the
environment's irradiance (its SH coefficients against 1.147's
`DynamicEnvironmentMapManager`, at the same position and time). Canonical
times: noon, golden hour, dusk and night, at ground, mountain and orbital
altitudes, and underground (the case 1.147's #13988 fixed). This tier keeps
migration honest without freezing 1.x's approximations.

**Deliberate divergence (against references, not 1.x).**

- _Atmosphere._ One physically based model for everything that involves the
  atmosphere: the sky, aerial perspective (what 1.x splits into ground
  atmosphere and fog), the sun's and moon's color through the air, and the
  environment lighting. 1.x has four separate approximations: `SkyAtmosphere`,
  ground atmosphere, `Fog` and the dynamic environment map, each with its own
  constants and color corrections (HSB shifts, brightness, saturation, and a
  `pow(color, gamma)` kept as a precision workaround). Single scattering with
  ad hoc step weighting, no ozone (the blue of twilight), no multiple
  scattering (skies too dark at low sun and from altitude).
- _Environment lighting._ The radiance at the content's position, integrated
  properly: SH9 projection weighted by solid angle, GGX-prefiltered specular
  with filtered importance sampling, energy compensation for multiple
  scattering on rough metals, specular occlusion, and the ground's bounce
  from its albedo.
- _Color correction is not lighting._ Brightness, saturation and white
  balance belong in the display transform, after the light has been
  computed, not inside the environment map.
- _Materials._ The full glTF PBR model and the KHR material extensions
  (specular, IOR, transmission, volume, clearcoat, sheen, iridescence,
  emissive strength) as specified, judged against the Khronos glTF Sample
  Renderer's images of the sample models, which replace 1.x as the oracle
  for materials.
- _HDR, exposure and display._ Always HDR (as now); exposure, tonemapping
  and the display encoding last (below).
- _Shadows and ambient occlusion._ Sun shadows and ambient occlusion on by
  default once they are fast enough; 1.x has both opt-in. Judged at L3.

**References** for the third tier, each a test: a brute-force atmosphere
integrator (spectral, many steps, several scattering orders) in a compute
shader, against which the real-time LUTs must agree within a few percent of
radiance; a Monte Carlo integration of an environment's radiance for every
pixel, against which the SH and the prefiltered specular must agree (FLIP);
the Khronos sample images for materials; published clear-sky illuminances
for the photometric scale (below); L3 sign-off for the look.

#### Sky and sun models

| Model                                            | What it is                                                                                              | Altitudes                | Fit for a globe                                                        |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------- |
| Preetham (1999)                                  | analytic fit, clear sky                                                                                 | ground                   | no: wrong at low sun, no space view                                    |
| Hosek–Wilkie (2012)                              | analytic fit, clear sky, ground albedo and turbidity                                                    | ground                   | no: no aerial or space views                                           |
| Prague (Wilkie et al. 2021)                      | fitted to spectral simulations, polarization, visibility                                                | up to about 15 km        | no as the default (no space views, large data); yes as a reference     |
| Bruneton & Neyret (2008; reference 2017)         | precomputed multiple scattering in 4D tables                                                            | any                      | good, but the tables are costly to rebuild when the atmosphere changes |
| **Hillaire (2020)**, Unreal's sky and atmosphere | small LUTs (transmittance, multiple scattering, sky view, aerial-perspective volume), rebuilt per frame | any (ground to space)    | **yes**: any altitude, cheap, every parameter dynamic                  |
| CIE standard skies, Perez all-weather            | luminance distributions fitted to measurement; Perez driven by measured direct and diffuse irradiance   | ground (an analysis sky) | yes for daylighting analysis, not for visuals from altitude            |

The default is **Hillaire's model**, computed spectrally (at least 4
wavelengths, then to RGB through the CIE matching functions, as Bruneton's
2017 reference does) with an ozone layer, parameterized per body (Earth by
default; Mars and the Moon, which 1.x's ellipsoids already support, need
only other constants). The sun is a disk of its real angular size with limb
darkening, its color the transmittance along its path; the moon is lit by
the sun with its phase; stars are light from the catalog (next section).

#### The night sky

1.x draws stars from a sky box: six images of a star map (Tycho), at a
fixed brightness unrelated to the scene's light, magnified and soft at
any zoom. 2.0 draws the sky as it is, so the camera decides what shows:

- **Stars from a catalog**, as points: the Yale Bright Star Catalogue
  first (about 9,000 stars to magnitude 6.5, all a naked eye sees), then
  Hipparcos (118,000) and Gaia's bright stars (millions, to magnitude 12
  and beyond, streamed by magnitude like tiles). Positions in ICRS with
  proper motion to the date, turned to Earth-fixed axes with the same
  transforms as the sun (precession, nutation, Earth rotation; L0 parity
  with 1.x's `computeIcrfToFixedMatrix`).
- **Photometric brightness**: a star of visual magnitude m gives an
  illuminance of 2.54 µlux × 10^(−0.4 m) on a surface facing it (Vega,
  magnitude 0, about 2.5 µlux). Each is drawn as a small point-spread
  splat whose energy is exactly that illuminance, in the same units as the
  sun and sky, so exposure does the rest: invisible at EV100 15 in
  daylight, appearing through twilight as the sky darkens and the camera
  (or automatic exposure) opens up, the naked-eye sky at about EV100 −2.
- **Color** from the catalog's B−V index: an effective temperature
  (Ballesteros 2012), a blackbody spectrum through the CIE matching
  functions, scaled to the V-band magnitude.
- **Through the atmosphere**: each star's light attenuated by the
  atmosphere's transmittance along the line of sight (extinction toward
  the horizon) and seen against the sky's own radiance, so stars fade
  into twilight and haze physically, not by a fade parameter.
- **Diffuse light**: the Milky Way and zodiacal light as a low-resolution
  all-sky luminance map (the natural night sky is about 2 × 10⁻⁴ cd/m²),
  under the same exposure.
- **Deep-sky objects** in their real places: Andromeda, the Magellanic
  Clouds, the Orion Nebula, the Pleiades and other bright Messier and NGC
  objects, as images with their catalog surface brightness (Andromeda's
  core about 22 mag/arcsec², some 2 × 10⁻⁴ cd/m², as faint as the natural
  night sky): they show only under a dark sky at long exposures, as with a
  real camera. Image licenses to check.
- **Moon and planets** from ephemerides: the moon's disk lit by the sun
  with its phase (and earthshine), the planets as points with their
  magnitudes. The moon's light also lights the scene at night (about
  0.25 lux when full).
- **Looks**: point-spread size in pixels, independent of zoom; glare on
  the brightest stars and planets from the bloom pass (a camera or eye
  effect, not the star's size); scintillation as an option.
- Catalog licenses to check before shipping data (Yale BSC and Hipparcos
  are public; Gaia's data asks for attribution).

Progress (r42): **a star map behind the sky**, the first step. The
`Viewer` loads 1.x's Tycho star map (six cube faces, already in the
repository) into `Engine.setStarMap`; the sky draws it behind the
atmosphere, turned to Earth-fixed axes by the clock (`icrfToFixed`:
precession to the date, IAU 1976, then sidereal time; nutation, under 20″,
and polar motion left out; 1.x turns its sky box by sidereal time alone,
0.36° off by 2026 from precession), and dimmed by the atmosphere's
transmittance along the ray to space (gray, from the sky-view table's alpha
inside the atmosphere and from the march above it), so stars fade toward
the horizon and into twilight and vanish behind the ground. A full texel is
0.2 cd/m² (`STAR_MAP_LUMINANCE`): the map's mean is then about 3 × 10⁻⁴
cd/m², the natural night sky's, so the map stands for all of it (stars,
airglow, zodiacal light) and shows only as the exposure opens: nothing at
EV100 15, the stars at about EV100 −2. Its limits are the reason for the
catalog: each star is blurred over texels that are magnified at ordinary
fields of view (0.09° per texel against about 0.03° per pixel) and clipped
at 8 bits, so a bright star's light, which belongs on one pixel, is spread
over dozens (the brightest reach 0.07 of white at EV100 −2, where Vega
drawn as a point would saturate). Tests check the rotation against Sirius's
annual precession and Polaris.

The stars as the eye sees them (r43): physically, a daylight exposure
leaves them black, from orbit as from the ground (as in photographs of the
sunlit Earth), and the `Viewer` showed none. `View.starExposure` (EV100)
exposes them as the eye does against a dark sky: where the sky behind a
star is under a few percent of white, its light is taken at that exposure
when the view's is less open, so they show against space and the night sky
at EV100 15, and twilight's blue or the day sky still hides them. The
engine leaves it unset (physical); the `Viewer` sets −3, about 1.x's
brightness.

Catalogs: none we checked can be shipped in this Apache-2.0 repository.
Hipparcos and Tycho-2 (ESA) and Gaia are CC BY-NC 3.0 IGO; HYG and AT-HYG
are CC BY-SA 4.0; the Yale Bright Star Catalogue is its authors'
copyright, redistributable unmodified only (Debian's reading, from the
data center); SKY2000 (NASA Goddard) states no license and is compiled
from the others. The Tycho star map 1.x ships stays; points would need
ESA's permission for commercial use or a legal opinion on the Yale
catalogue.

Next for the stars (asked for after r44): they look soft, and at high
brightness show visible edges. Both come from drawing a texture: 1.x's
Tycho map is six 8-bit sRGB faces, magnified (a star is a blur several
texels wide, not a point) and quantized (256 levels stretched over many
stops at an open exposure draw contour bands; the faces' seams may show
too). Film VFX draws stars as points, not pixels of a texture:

- each star a point source with its flux (from magnitude) and color (from
  its temperature, B−V), splatted energy-conserving at its subpixel
  position through a point spread function (a Gaussian or Airy core, the
  eye's or the lens's), so a star stays one sharp point at any field of
  view and its brightness doesn't shimmer as the camera turns;
- glare for the bright ones as the eye sees it (Spencer et al. 1995,
  "Physically-Based Glare Effects for Digital Images": a bloom and the
  ciliary corona's fine rays), or a lens's diffraction spikes for the
  camera;
- twinkle (scintillation) near the horizon, where the air is thickest;
- the Milky Way and the faint unresolved stars as a smooth background in
  float, below the points.

The catalog problem stands (none we found ships under Apache-2.0); the
points could come from the Tycho map itself (its peaks: positions,
fluxes, colors), the map kept, low-passed, as the background.

Progress (r44): **stars as points**. Looking closer, the map draws a star
as one texel (5′; bright ones as disks 4-5 texels across), its value
growing with brightness, compressed (Sirius about 230 of 255, a ninth
magnitude star about 16), over an 8-bit background; drawn as a texture, a
star was a texel magnified and filtered, and the background's steps drew
contours at an open exposure. And 1.x uploads cube faces upside down
(`flipY`), so the 2.0 sky had each face mirrored (Procyon at −5° for +5°).
atmosphere/stars.ts reads it out in a worker (1.1 s): 86,000 stars, each
at its texels' centroid (Procyon, Capella, α Centauri, Orion where they
are), its brightness by rank (sorted by its light in the map, the n-th
takes the magnitude the sky has n stars brighter than: the map's
compression drops out) and its color; the rest, low-passed in float
(64² a face), is the background, its brightest (the Milky Way's core)
1.5 × 10⁻⁴ cd/m² above the rest. Each frame the stars are splatted into a
view-sized layer through a point spread function in CSS pixels (a
Gaussian core integrated over each pixel, energy-conserving at any
subpixel position, and a halo of 5% of the light, σ 3 CSS px: a bright
star past white is larger), culled where too faint to show; the sky reads
the layer as it read the map (the air's transmittance, the dark-sky rule,
the Moon). The whole frame of a dense star field at EV100 −10 takes 0.5 ms.
Limits: the brightness of the brightest stars is the map's, off by about
a magnitude on average and more for a few (Spica 1.0 reads 4.6, Alnilam
1.7 reads 5.2: Tycho-2 handles the brightest stars poorly); a catalog
would fix it, and colors from B−V. Still to do: diffraction spikes for the
camera, the corona's rays, twinkle (needs continuous rendering).

Next steps (r44, after the night work). Now, in this order:

1. **Shadow cascades' aliasing**: filtered lookups (a Poisson or Vogel
   disk of comparisons, scaled to each cascade's texel) instead of one
   hard comparison, and cascades fitted to what is drawn, not only to the
   view's slices. Done (r44), the filter: Castaño's optimized PCF (a 5 × 5
   tent from 9 bilinear comparisons) for the 3 × 3 box; with the sun
   stepping 0.08° over lower Manhattan from 450 m (NYC buildings), pixels
   jumping by more than 8 levels went from 38,000 to 27,000 a step (some
   of the rest is the shadows' own motion). The fit is still to do: the
   buildings there fall in the third cascade, 0.6 m a texel; fitting the
   cascades to the depth actually on screen (Lauritzen's sample
   distribution shadow maps, a min/max reduction of the depth buffer on
   the GPU each frame) is the next step, the content's bounds being no
   help once the globe reaches the horizon. Done (r44), their splits: a
   compute pass reduces the opaque depth to the nearest and farthest
   surface along the view (depthRange.wgsl, one sample a pixel, the sky
   left out), read back a frame or so late; the cascades cover that (a
   fifth nearer, a quarter farther, in quarter-octave steps that widen at
   once and narrow only past a step and a half: shadows.ts `shadowRange`)
   within the 20 × height they had. The same view and sun steps: 11,900
   pixels a step against 15,700 (the nearest building 717 m off, the
   cascades from 512 m instead of 1 m); in a street canyon they cover 38
   to 861 m instead of 1 to 600. Each cascade's extent still fits its
   slice's sphere (steady as the camera turns); fitting it to the
   surfaces seen from the sun is Lauritzen's other half, left for when
   its crawl as the view turns can be kept down.
2. **Haze at the day/night line from orbit**: the per-vertex march
   interpolates a step (lit, then in the Earth's shadow) across the
   coarsest tiles' triangles, drawing blocky streaks. Where a triangle's
   vertices disagree, march per pixel. Done (r44), otherwise: marching
   per pixel where the vertices disagree left a patchwork (the vertices'
   haze is off across every coarse triangle, not only there), and per
   pixel everywhere cost 6.8 ms. From 500 km up (all of it from 1,000)
   the haze now comes from a screen grid (640 × 400, a ray per texel to
   the ground in the space where the ellipsoid is the ground sphere, as
   the orbit sky; sky.wgsl `aerialScreenFragment`), sampled bilinearly:
   the day/night line is a smooth curve, and the frame from 18,000 km
   takes 3.3 ms against 4.1. The march's shadow test is soft over a
   degree (the sun's disk, refraction) or a step's span.
3. **The environment's rebuild cost** (about 10 ms when the sun, the Moon
   or the exposure moves): fewer prefilter samples with filtered
   importance sampling, the irradiance from a smaller level. Done (r44): the
   cost was mostly elsewhere. Timed alone, a rebuild took 3.0 ms of GPU
   time and 0.8 ms to encode, 2.2 ms of it the sky cube's mips: a render
   pass per face and level, 42 for the 128² cube, nearly all overhead. A
   compute kernel now averages a level's six faces in one dispatch (7 in
   all); the prefilter takes 64 samples at its first blurred level and 32
   after (filtered importance sampling: 256 did no better, the IBL
   reference within 0.0-2.6% of Monte Carlo for dielectrics as before);
   the irradiance cube is 16² a face. A rebuild now: 0.6 ms of GPU, 0.07
   ms to encode. The irradiance from 10 km up moved from 3.9% to 6.1% of
   the integral (the zenith texels lean 3.6° toward the bright ground),
   the ground's rows within 0.9% as before.
4. **The eye's local adaptation**: the eye adapts to each region it
   looks at, not to the view as a whole: a moonless night is less black
   to a dark-adapted walker than one global adaptation shows, and bright
   lights at night keep their color. Ferwerda's gains per pixel from a
   blurred adaptation map, blended with the global one. Done (r44): a
   plain blur of the image's log luminance (a sixteenth of its size,
   σ 2 texels) haloed every edge (the ground beside dark buildings glowed
   where it met them), so each pixel now adapts among its neighbors of
   about its own brightness: a bilateral grid (Chen, Paris and Durand
   2007), 16 × 16-pixel cells by 16 levels of log luminance over ±12 stops
   of the view's adaptation, blurred over 7 × 7 cells and 3 levels, read
   trilinearly at the pixel and its level (adapt.wgsl, present.wgsl
   `eyeSees`); halfway to it in log, no more than 2 log10 from the view's.
   0.2 ms at 1831 × 1416. From orbit the dark land keeps its texture
   beside the lit cities; moonlit streets are unchanged, without halos.
   What it can't do: lower Manhattan on a moonless night stays black,
   since nothing lights the facades (starlight only) while the ground
   under them carries the city lights. The missing light is the city's
   own: see "City light" below. Also fixed: a meter reading in flight as
   the exposure turned fixed left automatic exposure pending, never to
   meter again. Adaptation's pace (r44): a real eye's at `speed` 1
   (to light in 0.1 s for the cones and 0.4 s for the rods; to dark, time
   constants of 180 s and 600 s, after Hecht, Haig and Chase 1937's
   plateaus at 10 and 30 to 40 minutes), 400 times that by default (to
   dark in a few seconds; scene/eye.ts `EYE_ADAPTATION_SPEED`), a slider
   from ×1 to ×1024 in the viewer.
5. **The Moon**: its libration (its orientation from the IAU rotation
   model, so the face it shows wobbles as it does), and a sharper map
   than 1.x's 256 × 128 (NASA's CGI Moon Kit, public domain). Done (r44):
   time/moon.ts `moonAxes`, the IAU model (Archinal et al. 2011, as 1.x's
   `Iau2000Orientation`), within 0.15° of Meeus's example 53.a for the
   Earth's selenographic longitude and latitude and its pole's position
   angle; the Viewer turns it to Earth-fixed axes with the clock. The map
   comes from Cesium Moon Terrain on ion when the token reaches it (the
   Asset Depot; io/moonMap.ts): its tiles' textures are equirectangular
   patches of their longitude and latitude (u and v linear in them within
   10⁻⁷), so a level of the tree laid side by side is the map, 2048 ×
   1024 from level 2's 32 tiles of 256², no geometry drawn; the band's
   tiles stop at 85°, the last rows stretched over the caps. 1.x's map
   until it arrives or without it. The disk reads it through its mips with
   analytic gradients (the surface a pixel away), anisotropically: the
   limb and the poles alias no more. Its imagery is the LROC WAC Global
   Morphology Mosaic, built from images under a low sun for the relief:
   shading baked in, so a full Moon shows craters it shouldn't. An albedo
   map (the WAC normalized reflectance, the CGI Moon Kit's) lit by the
   sun would not.
6. **Lights in the scene**: point and spot lights (`KHR_lights_punctual`,
   candela), clustered forward shading, unshadowed (the order in "Lights
   beyond the sun", above). Done (r44): `World.addLight` at a transform
   (moved, hidden and removed with it); a model's glTF lights at their
   nodes. Each view culls its lights to its frustum on the CPU, nearest
   1,024 kept, each reaching where its light on white would show below
   1/256 of white at the view's exposure (or its glTF `range`), faded by
   glTF's window; a compute pass sorts them into 32 × 18 × 32 froxels
   (log depth), a workgroup per tile culling to its column in shared
   memory, then a thread per slice keeping its 16 brightest (lights.wgsl);
   the opaque pass shades its froxel's (scene/lights.ts, opaque.wgsl
   `punctualLight`). 576 spots over lower Manhattan at night: 1.1 ms to
   sort, about 3.5 ms more in the opaque pass at 1831 × 1416. Most of that
   is overdraw: the MSAA opaque pass shades every fragment that passes
   the depth test as drawn (the ambient occlusion prepass is single
   sampled), so lights cost per fragment, not per pixel. Next for many
   lights: a depth prepass in the MSAA pass and shading at equal depth
   (Forward+'s z-prepass, Harada et al. 2012), which also cuts the sun's
   and the environment's shading of hidden fragments. Done (r44): the
   opaque pass draws the world's depth first (`World.depthBundle`: the
   shadow casters' vertex stage and discards, no color written), then its
   triangles shade where their depth equals it (no depth written; lines
   draw as before); positions are `@invariant`, so both stages agree to
   the bit. An override shader keeps the old way. Over lower Manhattan by
   night the opaque pass took 4.3 ms against 6.4 without lights (the
   depth included), 6.9 against 10.0 with the 576 spots. Parity, models,
   imagery, globe and tileset unchanged (models with and without the
   prepass alike). Point sets and instances draw outside it (r48, r49:
   their vertices cost more twice than their overdraw does).

Later:

- **The Moon's albedo**: its map without the mosaic's baked-in shading,
  lit by our own: NASA's CGI Moon Kit (SVS 4720, public domain), its
  color map adapted from the LROC WAC Hapke-normalized mosaic (over
  100,000 WAC images, normalized to one geometry of sun and view; 70°N to
  70°S, the poles from LOLA's albedo map), with LOLA's elevation for the
  relief (a normal map: shadows at the terminator, flat at full). Its
  files are TIFF and EXR: converted once to a PNG or JPEG, committed
  (public domain) or fetched; the raw mosaic is in the LROC archive
  (WAC_HAPKE). Others: Clementine's 750 nm mosaic (USGS), Kaguya's
  Multiband Imager.
- **Other bodies**: the Moon (Cesium Moon Terrain) and Mars as 3D Tiles
  in their own frames (a body's ellipsoid, `3DTILES_ellipsoid`, its
  orientation from the IAU model, its ephemeris), lit by the sun without
  an atmosphere, for flying from one to another; the sky's disk is the
  same Moon from afar.
- **City light**: on a moonless night a city lights itself. The night
  lights' upward light scattered by the air (the sky glow, an urban sky
  some 100 times the natural one) into the sky and its environment, and
  the lit ground's light up the facades (the environment's lower half),
  so streets and buildings show as they do at night, not black. Done
  (r44): globe/cityLight.ts averages the night lights' image (level 7,
  about a kilometer a pixel, 2 × 2 tiles fetched once) within 30 km of
  the camera, weighted 1/(d² + 2 km²), as the ground's mean light, cd/m²
  (0.26 over lower Manhattan); the sky (sky.wgsl `cityGlow`, with the
  night's own light, so in the drawn sky and the environment alike) shows
  it below the horizon, and above it a tenth of it at the zenith, three
  times that at the horizon, warm, fading with height (a 1.5 km haze and
  the air's 8 km). Facades in lower Manhattan's streets show by night
  where they were black. To tune: the stars still fade only as the sky's
  luminance grows, so more show over a city than do.
- **Stars, part two**: diffraction spikes for the camera, the eye's
  corona rays, twinkle; a catalog for the brightest stars' magnitudes and
  colors (a license decision).
- **Translucency**: order-independent transparency (M4); cut-out and
  blended materials are drawn opaque until then. Done (r45): see M4
  (§6), "Progress (r45)".
- **Weather fog**: a haze medium of its own beside the clear air's.

Progress (r43): **the Moon**. `moonPosition(time)` (time/moon.ts) ports
1.x's Simon et al. (1994) lunar theory (within 0.04° and 0.05% of
distance of Meeus's example 47.a; since replaced by Meeus's chapter 47,
ELP-2000/82's main terms, within 16″ and 27 km of DE440 over 2000 to
2050, where Simon's main terms were 0.31° and 2,051 km), turned to Earth-fixed axes with
`icrfToFixed`; `Engine.moonPosition` places it (the `Viewer` sets it from
its clock; unset, no Moon, as in the comparisons with 1.x). The sky draws
its disk from the camera's own position (the Moon's parallax reaches 1°),
at its angular size, textured with 1.x's `moonSmall.jpg` (near side in the
middle, north toward the ecliptic's pole, libration left out) and shaded
as Lommel-Seeliger, 2μ₀/(μ₀ + μ), which is flat at full as the Moon
looks; its total brightness follows its albedo (0.12) and Allen's phase
law (a half moon a tenth of a full), the map normalized to its mean. The
air dims and reddens it as it does the sun: the sky-view table's sun row
holds, in a second texel, the sun's light through the air along the
Moon's direction; above the atmosphere the march's transmittance applies.
It hides the stars behind it and shows faintly in the day sky (a crescent
at 39° with the sun 68° away is a tenth of the sky's brightness, as seen).
Its light reaches the scene as a second directional light: the sun's
light through the air toward the Moon (the sun-light table) times its
share (albedo × its angular radius² × phase, 2.4 × 10⁻⁶ when full, about
0.25 lux), shadowed by the sun's cascades, which follow the Moon when the
sun is down and it is up. Next: moonlight in the sky (scattered, the
moonlit sky's blue) and in the environment, which would light what the
Moon doesn't reach; earthshine on the dark part; then starlight and
airglow in the environment (about 1 mlux without a moon).

Progress (r44): **night, and the eye**. Moonlight scatters in the air
(the sky-view table's second set of rows, about the Moon; the orbit sky,
the haze volume and the per-vertex march add it while the sun is down);
the night sky lights itself (airglow, a 87-97 km shell, 1.1e-4 cd/m² at
the zenith; zodiacal light and faint stars, 0.8e-4; about 1 mlux on the
ground, Leinert et al. 1998); the environment carries both, so nothing
is black that something lights; earthshine shows on the Moon's night side.
How light becomes an image is one choice, `View.exposure`: a camera's
(`{ ev100 }`, `{ scale }`, metered `{ auto }`) or the eye's (`EYE`, the
`Viewer`'s default; `starExposure` is gone, the stars as seen being part
of it). The eye (scene/eye.ts) is a model of vision, not a key: its
cones and rods each adapt to the scene (a center-weighted meter, photopic
and scotopic, over the 65th-98th percentiles of a log-luminance
histogram, as Unreal's eye adaptation), and each shows what it sees as
visible as it was (Ferwerda et al. 1996's threshold curves: the cones in
color, the rods gray-blue as Thompson et al. 2002, weighing in through the
mesopic range). Thresholds keep visibility, not brightness: alone they
showed a moonlit scene about as bright as a sunlit one. How bright night
looks follows Tumblin and Rushmeier (Stevens' brightness data): 1.8 stops
darker by moonlight, 3.1 under starlight. One calibration: by day the
adaptation level shows at 0.18 of white. That target is a choice, made by
comparison with 1.x and the owner's review on 2026-11-08, not a physical
constant; it is the eye's alone, and a metered camera's K = 12.5 (0.104 of
white at the meter) is unchanged. The meter's reading is no lower than the
98th percentile less 4 stops, so a small bright crescent in a dark image
is not blown out (daylight, whose band lies within 4 stops, is
unchanged).
Adapting to light takes a moment (cones 0.1 s, rods 0.4 s), to dark longer
(the eye's minutes compressed to 1.5 s and 4 s). The eye sees the stars
against a dark sky. The plain mean had let the night half of the Earth
from orbit open the exposure ten stops. Settled: a sunlit city about
EV100 16, the sunlit Earth from orbit about 13.8; a moonlit city dark,
gray-blue and legible; a moonless one, with nothing lit, near black (the
brightness model's verdict, darker than a dark-adapted walker finds it).
City lights: the globe's second imagery layer, light the surface emits
(`GlobeOptions.lights`; the `Viewer` takes NASA's Black Marble, ion asset
3812, through `IonTmsImagery`), each terrain tile's night slice in the
record's last word, its brightest white 0.3 cd/m² as seen from above
(VIIRS's day-night band near saturation in city centers), dimmed by the
air like any surface; `View.cityLights` turns them off. A camera at EV100
−4 sees them orange, as photographs from orbit do; the dark-adapted eye
sees them mostly with its rods, gray-white.

#### Fog and aerial perspective

- **Aerial perspective from the atmosphere** (Hillaire's froxel volume of
  in-scattering and transmittance): haze that depends on distance, altitude
  and sun direction, replacing both 1.x ground atmosphere and `Fog`.
- **Weather haze**: an extra participating medium with exponential height
  density, integrated analytically, set as a visibility in kilometers
  (METAR-style) and a color, for conditions the clear atmosphere doesn't
  cover (mist, smog, dust).
- **Volumetric fog later**: a froxel volume that samples sun shadows, for
  light shafts and local fog volumes. It needs temporal filtering, the first
  temporal pass 2.0 would have.
- **Detail from transmittance**: 1.x raises the screen-space error of tiles
  in its fog. 2.0 can do the same from the atmosphere's transmittance (a
  tile barely visible through the haze can be coarser), so the saving
  follows what the viewer can actually see.

#### Other atmospheric effects

- **Clouds**: first a 2D cloud layer (coverage from satellite imagery or
  weather data), with cloud shadows on the ground and its effect on the sky
  and environment lighting; volumetric clouds (Nubis- or Frostbite-style
  raymarching with temporal reprojection) later. The engine provides the
  participating-media framework (froxels, shadow maps, temporal
  accumulation, the atmosphere's light and transmittance); a cloud system
  plugs into it, so clouds can be an example or an extension rather than
  core.
- Precipitation (particles, wet materials), city lights at night (emission
  from night imagery, which 1.x blends as a second imagery layer), aurora,
  atmospheric refraction near the horizon, eclipses. All later, all
  consumers of the same framework.

#### Design and architecture models

For design review what makes an image accurate is, in order:

1. **Photometric units throughout** (next section): a model at noon in June
   in Phoenix receives the right lux, not "intensity 2".
2. **The sun's position** (L0 parity, already exact) and **its color**
   through the atmosphere (transmittance), for orientation and shading
   studies.
3. **Materials as authored**: glTF base color as measured albedo, IOR,
   transmission and volume for glazing, specular for coatings. Glass in
   particular needs transmission and refraction, not alpha blending.
4. **Shadows and ambient occlusion**, which dominate how buildings read.
5. **The sky for analysis**: alongside the visual sky, a daylighting mode
   with CIE standard skies or the Perez all-weather model driven by weather
   data (direct normal and diffuse horizontal irradiance from an EPW file),
   which is what daylighting tools such as Radiance use. Same units, so a
   false-color view of illuminance on surfaces is meaningful.
6. **Photometric lights**: glTF's `KHR_lights_punctual` already gives
   intensities in candela (point and spot) and lux (directional); add IES
   and EULUMDAT profiles for luminaires.
7. **Indirect light** (interiors, courtyards, light bouncing off a facade)
   needs global illumination (next section).

#### Global illumination

WebGPU has no hardware ray tracing yet, so real-time GI here means screen
space, software ray tracing in compute shaders, or precomputation. Outdoors
at globe scale most indirect light is the sky, occluded; indoors and
between buildings it is bounces. In order of cost and payoff:

1. **Sky visibility**: ground-truth ambient occlusion (GTAO) with bent
   normals, so the environment's SH is sampled in the unoccluded direction,
   and the multi-bounce approximation (Jimenez et al. 2016) so occlusion
   doesn't over-darken bright materials. Screen space, cheap; it is also
   M4's ambient occlusion.
2. **Screen-space indirect light**: the visibility-bitmask extension of
   GTAO (SSILVB, 2023) gathers one bounce from what's on screen in the same
   pass. Near-field color bleeding; misses what's off screen.
3. **Probe GI with software ray tracing** (DDGI, Majercik et al. 2019): a
   grid of irradiance probes with depth moments (to avoid leaks through
   walls), updated each frame by rays traced in compute against a BVH of
   the world's triangles, lit by the sun (shadowed by the same rays) and the
   atmosphere. Scoped to where it matters: around a design model, or
   cascades centered on the camera; probes update incrementally as tiles
   stream in. The BVH is the main new piece of infrastructure; 2.0's ray
   casts (`castRays`) already walk the world's triangles, and the BVH is
   shared with the path tracer later.
4. **Baking for static design models**: the path tracer, once it exists,
   bakes probes or lightmaps for a model in the background, the most
   accurate indirect light at no cost per frame. Design models are static,
   so this suits AEC best.

Not chosen: voxel cone tracing (memory at city scale, voxel leaks), light
propagation volumes (leaks), Lumen-style signed distance fields (too large
an undertaking for now). Radiance cascades (Sannikov 2023) are worth a spike
in screen space. Shared infrastructure for all of it: a depth and normal
prepass (2.0 shades forward with MSAA), a hierarchical depth buffer,
temporal accumulation with denoising (shared with volumetric fog and
clouds), and the BVH.

#### What to take from Unreal Engine 5

Unreal's renderer is the most complete public example of physically based
real-time lighting at scale. What transfers to 2.0, and what doesn't:

- **A path tracer in the engine as the reference.** Unreal ships one that
  renders the same scene, materials and lights, and Epic checks Lumen
  against it. 2.0's references (§4.2 tiers) should grow into the same: the
  path tracer we plan to experiment with is first the oracle for every
  real-time approximation, then a product feature.
- **One sky system feeding everything.** Sky Atmosphere (Hillaire's model,
  above), Volumetric Clouds and the Sky Light, which re-captures the sky
  (with clouds) into the environment lighting in real time. The same shape
  as §4.2: one atmosphere, one environment derived from it.
- **Physical units and exposure as the default.** Lux, candela, nits and
  EV100 throughout, with automatic exposure set in physical terms. Epic made
  these the default after years of unitless settings; 2.0 starts there.
- **Lumen's structure, not its implementation.** Traces that fall back by
  distance (screen space, then near geometry, then far), radiance caching
  so a pixel reuses light gathered nearby, and temporal reuse with
  denoising. Its software tracing relies on signed distance fields per mesh
  and a global one, too heavy for streamed, city-scale content in a
  browser; 2.0's equivalent is the probe GI on a BVH above, keeping the
  same fallback-and-cache structure.
- **Virtual shadow maps.** Very high resolution shadow maps split into
  pages, rendered only where the view needs them and cached until the
  geometry or the sun moves. A good fit for streamed 3D Tiles (a tile's
  arrival invalidates its pages only) and for the sun over a large scene;
  the likely target after cascaded shadow maps.
- **MegaLights.** Many shadowed lights sampled stochastically per pixel and
  denoised, rather than a shadow map per light: relevant for interiors with
  many luminaires (IES), later.
- **Substrate.** Materials as layers of slabs (coatings, films, subsurface)
  instead of a fixed list of shading models. 2.0's custom shading (after
  M4) should be able to grow that way, with glTF's metallic-roughness and
  KHR extensions mapping onto it.
- **Visibility buffer.** Nanite rasterizes triangle IDs and shades
  afterwards. 2.0 is already GPU-driven; a visibility buffer would also give
  the depth and normal prepass that screen-space GI and ambient occlusion
  need.

What doesn't transfer: hardware ray tracing (not in WebGPU), memory and
compute budgets sized for consoles and desktops, and baked lightmaps as the
default (content streams in, so baking is an option for static design
models only). Anything taken from Unreal is sized for a browser tab sharing
a laptop GPU.

#### Physical lighting units

What sets 2.0 up for them, decided before the atmosphere is written:

- **Units inside the renderer.** Luminance in cd/m² (nits) in the HDR
  buffer; illuminance in lux; the sun's illuminance outside the atmosphere
  (about 128,000 lux; 1,361 W/m²) attenuated by the atmosphere's
  transmittance, giving about 100,000 lux at the ground with a high clear
  sun; sky radiance from the same model in the same units. Lights in glTF's
  units (candela, lux); emission in nits (`KHR_materials_emissive_strength`
  scales an authored color to nits). No unitless "intensity".
- **Pre-exposure.** A sunny day spans about 20 stops from night, and fp16
  stops at 65,504, so shading multiplies by the current exposure before
  writing the HDR target (Frostbite's and Unreal's approach); the exposure
  of the previous frame is enough. Without it, noon overflows or night
  quantizes.
- **A camera.** Exposure as EV100 (aperture, shutter, ISO) or automatic
  (a luminance histogram, with adaptation speed), plus exposure
  compensation; the present pass then applies the tonemapper (Khronos PBR
  Neutral, as now, which keeps base colors recognizable for design review;
  AgX or ACES optional) and the display encoding.
- **HDR displays.** WebGPU canvases can be configured for extended range
  (`toneMapping: { mode: "extended" }` with an `rgba16float` canvas):
  output in nits, tonemapped only to the display's peak.
- **Spectral where it matters.** The atmosphere computed spectrally, then
  converted to linear Rec.709 RGB (later Display P3 or Rec.2020), with white
  balance in the display transform.
- **Measurement tools.** The inspector reads a pixel's luminance (cd/m²) and
  a surface's illuminance (lux), with false-color views, as Radiance's
  `falsecolor` does: the check that the units are right, and a feature for
  design review.

Progress (r42): **tone mapping options**. `View.toneMapping`: "pbrNeutral"
(Khronos PBR Neutral, the default: authored colors kept up to about 0.8,
for design review), "agx" (Sobotka's AgX as Blender 4 and Filament ship it:
a filmic curve in Rec. 2020 that desaturates bright saturated light toward
white, lower contrast, middle gray to about 0.21) and "aces" (the curve 1.x
applies, Narkowicz's fit, for parity with 1.x's ACES). In Dyno's viewer
(Globe and rendering), and mapped onto 1.x's tonemapper there (1.x has no
AgX). A fuller ACES (the reference rendering transform with its gamut
matrices, Hill's fit) and an exposure-independent "look" (contrast,
saturation) are follow-ups.

#### Lights beyond the sun: kinds, and how they scale (r42, design)

The sun is one directional light with cascaded shadow maps (above). The
rest, by kind:

- **Directional**: the sun, and the moon at night (about 0.25 lux full,
  through the same atmosphere tables; moon shadows from the same cascades).
- **Punctual**: point and spot lights, glTF's `KHR_lights_punctual` in
  candela (and lux for directional), so models and tiles bring their own.
- **Photometric profiles**: IES and EULUMDAT files (a luminaire's measured
  candela by direction) as a small 2D table per profile on a point or spot
  light: what lighting designers deliver, and what makes a facade or a
  parking lot read right at night.
- **Area lights**: rectangles, disks, spheres, tubes, shaded with
  linearly transformed cosines (Heitz et al. 2016: exact-looking specular
  and diffuse from polygonal lights for a few table lookups). Soft shadows
  need either shadow maps with filtering by the light's size or rays.
- **Emissive surfaces**: materials that glow (screens, signs, lit windows);
  they light the scene only through global illumination or stochastic
  light sampling, not as lights of their own.
- **Lights from data**: street lamps, building windows at night, vehicles
  (millions in a city, from OpenStreetMap or a city's assets), streamed
  with the tiles they belong to.

How they scale, in tiers that keep the forward MSAA renderer:

1. **Clustered forward shading** (Olsson et al. 2012; Doom 2016) for tens to
   thousands of lights: lights in a GPU table like draws, culled per view
   in compute into a froxel grid (the same froxels as aerial perspective's
   volume), each pixel looping over its cluster's lights. Unshadowed, or
   with shadow maps for a few chosen lights.
2. **Shadows for many lights**: one shadow map per light (six for a point
   light) doesn't scale. A shadow atlas whose pages are rendered by
   priority (screen coverage, intensity) and cached until the light or the
   tiles under it change, the per-light form of virtual shadow maps.
3. **Stochastic many-light sampling** (MegaLights in Unreal 5.5): per pixel,
   a few lights chosen by their contribution (ReSTIR's reservoir
   resampling, Bitterli et al. 2020, through a light hierarchy for
   importance), a shadow ray each, denoised over time. Cost is per pixel,
   not per light, so thousands of shadowed lights cost about what a few
   do. It needs what probe GI needs: a BVH of the world's triangles (rays
   in compute; WebGPU has no hardware ray tracing yet), temporal
   reprojection and a denoiser. Shared infrastructure, built once.
4. **Lights at city scale**: millions of lamps can't each be shaded. Like
   tiles, lights get levels of detail: near ones as lights (tier 1 to 3),
   farther clusters merged into one light (lightcuts, Walter et al. 2005),
   and the farthest only as their glow (emissive points under the bloom
   pass) with their light on the ground baked into a coarse irradance
   texture per tile from the data. Night views from the air are mostly
   that glow.
5. **Indirect light from all of them**: through the GI radiance cache
   (probe GI on the BVH, above), Lumen's structure: lights are gathered
   into probes once, and pixels reuse the probes, so bounced light doesn't
   multiply with the number of lights.

Order: the moon as a light, then `KHR_lights_punctual` with clustered
shading (unshadowed), IES profiles, an atlas of shadow maps for a few
lights, area lights, then the BVH, temporal accumulation and stochastic
sampling together with probe GI. Units throughout are photometric (lux,
candela, lumens), so the night exposure (§13.13) and the false-color
illuminance view work unchanged.

#### Scaling to the hardware

Both programmatically and with options, in layers:

- **Every feature has continuous knobs**: render scale of the expensive
  passes (ambient occlusion, GI, volumetrics at half or quarter
  resolution), sample counts, probe update rates, shadow resolution or
  virtual shadow page budget, froxel resolution, LUT sizes. Discrete
  switches (GI method: off, sky visibility, screen-space, probes) exist too
  but change rarely, because switching them is visible.
- **Tiers** (`low`, `medium`, `high`, `ultra`) are named sets of those
  knobs. An application sets a tier or individual knobs per engine and per
  view; anything it sets is never changed automatically.
- **`"auto"` (the default) chooses a starting tier** from what the adapter
  reports (vendor and architecture, limits, features such as subgroups,
  `shader-f16` and timestamp queries) and a short calibration on start: a
  known workload timed with GPU timestamps, cached per adapter so it runs
  once.
- **Then a frame-time controller adjusts the continuous knobs** from the
  per-pass GPU timings (the same budget idea as streaming's per-frame
  budgets, r38), with hysteresis so quality doesn't oscillate, and lowers a
  tier only after sustained overload (or a device loss or memory pressure).
- **Refine while still.** 2.0 renders on demand and knows when a view has
  settled. In motion it renders at the budget; once still, it keeps
  accumulating (more AO and GI samples, progressive shadows, eventually the
  path tracer) until the image converges to the reference, then stops
  rendering. A laptop and a workstation then show the same final image of a
  design model, only at different speeds.
- **Deterministic for tests and benchmarks.** The benchmark suite and the
  parity harnesses pin a tier (no `"auto"`, no controller), so runs stay
  comparable; the suite measures each tier separately, and tiers get
  budgets in the catalog (§16).

#### Order of work in M4

1. References first: the brute-force atmosphere and the Monte Carlo IBL
   integrator, with numeric tests.
2. Units, pre-exposure and the camera (EV100, automatic exposure), so
   everything after is written in nits and lux.
3. Hillaire's LUTs, checked against the reference; the sky and the sun
   disk.
4. Environment lighting from the atmosphere at the content's position and
   time (radiance cube, SH, specular), checked against the Monte Carlo
   reference, then intent parity with 1.147.
5. Aerial perspective and weather haze; fog-aware detail.
6. Shadows and ambient occlusion (GTAO with bent normals, the first GI
   step); then the daylighting sky, probe GI, clouds and the rest.

Progress (r42): **the sun's shadows**, cascaded shadow maps
(`View.shadows`; on in the `Viewer`, off by default in the engine so the
harnesses that compare with 1.x, which draws none, stay as they are). Four
cascades of 2048² (depth32float, one array), fitted per view per frame
(scene/shadows.ts): splits blending logarithmic and uniform (λ 0.9) out to
20 times the camera's height above the ground (200 m to 150 km, so a street
and a mountain range both get useful cascades), each slice in a bounding
sphere (its size independent of the camera's direction) seen from the sun
orthographically, centers snapped to a texel grid fixed to the ground (no
crawling edges), depth reaching 30 km or more toward the sun (mountains
outside the view cast into it at a low sun). Camera-relative throughout,
as the engine draws. Each cascade is a view block like the camera's (the
sun's projection, its box as the five culling planes), so it goes through
the same GPU culling and the same batches: per cascade the world is culled
to the box and its casters drawn from a depth-only bundle (no fragment
stage, so depth is tested before shading; a fragment stage only for
alpha-masked materials, which discard). The opaque pass picks the cascade
by view depth and takes 3 × 3 bilinear comparisons (an edge about three
texels wide), the receiver offset along its normal by 1.5 texels, plus a
slope-scaled depth bias on the casters; shadows fade out over the last 15%
of their distance. Cost in the Alps at 4.5 km, 2.6 megapixels with 4×
MSAA (RTX 3000 Ada laptop): about a fifth of the frame (the four cascades
plus their lookups in the opaque pass), half what the first try cost, which
ran a fragment stage for every caster. (Those timings were taken with idle
gaps between frames, which let this laptop's GPU clock down: absolute
times measured that way run several times high. Back to back, the synthetic
city's whole frame with shadows and ambient occlusion is 1.3-1.8 ms.) Limits and next steps: mixed-LOD
placeholders cast unclipped where they're not alpha-masked (coarse and
fine tiles cast nearly the same shadow); far cascades could update every other frame or
cache until the sun or the tiles move, leading to virtual shadow maps
(pages rendered where the view needs them and cached, a good fit for
streamed tiles); shadows from the clouds later (the Moon's: r43, with the night sky).
Measured on the way: the aerial-perspective volume's compute looked like
1 ms (1,024 threads each marching 256 steps), and the opaque pass in a
close oblique terrain view about 9 ms at that size, mostly the lighting
the imagery now gets (it took the unlit path before); both measured with
idle gaps between frames, where this laptop's GPU clocks down. Back to
back, the volume took 0.20 ms; with a thread per slice and a prefix scan
(r43) it takes 0.07 ms.

Cascades blend (r43): over the last tenth of each cascade, receivers mix
its light with the next's, whose sphere reaches back over that band, so no
seam shows where the texel size (and the bias with it) changes; the second
lookup runs only in the bands.

Progress (r42): **ambient occlusion** (`View.ambientOcclusion`,
`ambientOcclusionRadius`, default 3 m; on in the `Viewer`, off by default
in the engine like shadows). GTAO (Jimenez et al. 2016, in the form of
Intel's XeGTAO, ao.wgsl) from a **depth and normal prepass**: after the
view's cull, a single-sampled pass draws the same batches (the casters'
vertex stage, without aerial perspective; the opaque pass's discards) into
depth and normals. At half resolution, two slices per pixel at angles from
interleaved gradient noise, six steps a side, the horizon on each side
within the radius (a falloff over its outer 60%), the cosine-weighted
visible arc integrated exactly; then per full-resolution pixel a
depth-aware 3 × 3 of the half-resolution result, upsampling and blurring
the noise at once, packed 8 bits a pixel into a buffer the opaque pass
reads (one global buffer, rewritten per view like the shadow maps, so the
recorded bundles never need a per-view binding; up to 4096 × 4096). In the
opaque pass it occludes the environment's light only: the diffuse through
Jimenez's multi-bounce fit on the surface's diffuse color (bright surfaces
lose less), the specular through Lagarde's specular occlusion. In the
synthetic city at 2.6 megapixels: the prepass about 0.1 ms, the trace
about 0.2 ms, the blur about 0.35 ms (back-to-back frames; full resolution
with a 5 × 5 blur was three times that). It is subtle in daylight, where
the sun dominates, and shows in shade, at building bases, in corners;
from far above, a radius of meters covers less than a pixel and it fades
out. Next: bent normals (the environment sampled in the unoccluded
direction), larger-scale sky visibility for terrain (valleys under ridges,
from the height field rather than the screen), and the visibility-bitmask
extension for one bounce of screen-space indirect light (SSILVB).

**Why a depth and normal prepass rather than a visibility buffer.** A
visibility buffer (Burns and Hunt 2013, Nanite's) rasterizes triangle IDs
and depth, then shades per pixel from them. For ambient occlusion and
other screen-space passes what's needed is depth and normals before
shading, which the prepass gives directly. The visibility buffer's other
half, deferred material shading, still waits on bindless textures (§7.1:
the material pass must reach every visible tile's textures), and writing
triangle IDs needs the `primitive_index` builtin, an optional WebGPU
feature not yet everywhere. The prepass draws from the same GPU-culled
batches the opaque pass does, so a visibility buffer can replace it later
without changing anything downstream: the prepass's targets are what the
AO, and later SSR and screen-space GI, read.

Progress (r40): **the atmosphere reference** (`src/atmosphere/`, Lab
"Reference atmosphere", `bench/run.mjs atmosphere`). A spectral Monte
Carlo volumetric path tracer in a compute shader: spectral tracking (four
wavelengths per path, Kutz et al. 2017), ratio-tracked transmittance toward
the sun, Rayleigh, aerosols (Cornette–Shanks) and ozone, a Lambertian
ground, any altitude; positions in a frame where heights above the sphere
have no cancellation. Bruneton's 2017 Earth parameters and spectral tables
(BSD-3-Clause, credited in `LICENSE.md`). Checked two ways: the CPU model
in double precision gives the photometric scale (132.5 klx outside the
atmosphere, 115 klx direct at sea level with the sun overhead, unit tests),
and the path tracer limited to one scattering event agrees with the CPU's
deterministic single-scattering integral within its own noise (six views,
256 independent estimates each, worst |z| 1.95). Full result, sea level:
zenith 1,440 cd/m² with the sun at 45°, multiple scattering 5% to 23% of
the zenith sky, diffuse horizontal illuminance 7.5 klx (this atmosphere's
aerosols are very thin, optical depth 0.005; turbidity is a parameter).

**The image-based lighting reference** (`src/lighting/`, Lab "Image-based
lighting vs reference", `bench/run.mjs ibl`): material balls (a dielectric
and a metal, roughness 0.05 to 1) rendered by 2.0 and by Monte Carlo
integration of the glTF BRDF under the same environment cube (cosine and
visible-normal sampling, balance heuristic, 1,024 samples per pixel),
compared on 2.0's linear HDR image, which views can now read back
(`View.readHdr`). Against the default sky, 2.0's spherical harmonics, split
sum and prefiltered specular are within 0.1-2.7% of the exact integral for
dielectrics and within 2.3% for metals up to roughness 0.35. Rougher metals
are brighter by design: in a white furnace a white metal reflects exactly
1.0 in 2.0 at every roughness (Fdez-Agüera's compensation), where the
glTF BRDF's single scattering keeps 0.37 at roughness 1. Measuring how much
energy compensation is right for colored metals needs a multiple-
scattering reference (Heitz et al. 2016), a follow-up. The procedural
sky's darker band below the horizon is now an explicit `belowHorizon`
option (default unchanged), so a furnace can be uniform.

**Physical units, the default** (r40). Light is in photometric units: the
sun's illuminance in lux (`ViewLighting.sunIlluminance`, default 100 klx
until the atmosphere supplies it), the sky in cd/m² (the procedural
gradient scaled to about 13 klx diffuse horizontal until the atmosphere
replaces it), and views expose with a camera: `exposure: { ev100: 15 }` by
default, `{ scale }` for unitless scenes, or `{ auto: true }` (a meter over
a 64 × 64 grid of the HDR image, reflected-light constant K = 12.5,
adaptation per second, background left out; the first reading is taken as
is). Shading pre-exposes (light × exposure is written, so fp16 neither
overflows at noon nor quantizes at night); present only tonemaps; glTF
emission is display-relative (added after exposure) until emission gets
units; `View.readHdr` returns cd/m². Checked: a ground patch of albedo 0.3
under the overhead sun reads 10,835 cd/m² (predicted 10,800 with the
sky), automatic exposure settles at EV100 16.4 (the meter's value, an
exposed mean of 0.104) and eases to 13.4 in about 2.5 s when the sun sets.
Everything compared with 1.x frame for frame stays in 1.x's unitless terms
(`UNITLESS_EXPOSURE`, `UNITLESS_SUN_ILLUMINANCE`, `UNITLESS_SKY`): the
parity harnesses (image, models, tilesets, imagery, globe: bit-identical
results) and the benchmark suite's 2.0 adapter (filmstrip FLIP against
1.147.0 unchanged). Dyno's Viewer keeps its 1.x-style sliders, mapped to
physical units for 2.0 (sun 2 is 100 klx, exposure 1 is EV100 15).

**The real-time atmosphere, first tables** (r40; `src/atmosphere/`, Lab
"Real-time sky vs reference", `bench/run.mjs sky`): Hillaire's
transmittance (256 × 64) and multiple-scattering (32 × 32) tables built on
the GPU from the reference's parameters, and a ray-marched sky from them,
checked against the spectral reference in cd/m². At three wavelengths
(Bruneton's real-time colors) the sky was 20-40% off near sunset and in
twilight; that was the three-wavelength color model, not the tables (the
CPU's single scattering at the same three wavelengths had the same
errors). It now computes at 8 wavelengths (bands of 50 nm over 380-780,
two passes of four, each band weighted by the solar spectrum through the
CIE functions, within 0.5% of the full spectral luminance): daytime probes
within about ±7%, the whole sky within 2-5%, sunset within -7%..-1%, 10 km
within ±4%; twilight (sun 3° down) +6% over the whole sky with the
dimmest directions +10-50%, where Hillaire's isotropic multiple
scattering is weakest (a refinement for later). Next: the sky-view table
and drawing the sky and the sun's disk, then the environment lighting and
the sun's illuminance from the atmosphere (replacing the procedural sky
and the fixed 100 klx), then aerial perspective.

**The sky in views** (r41; `src/atmosphere/Sky.ts`, `sky.wgsl`). Views draw
the real-time atmosphere behind the scene by default (`View.background`
"atmosphere"; "color" keeps `clearColor`), with the sun's disk (its real
angular size, 0.53°, limb darkening, seen through the whole atmosphere;
`View.sunDisk` turns it off). Drawn inside the opaque pass after the scene:
a fullscreen triangle at the far plane where the depth is still the cleared
0 (reverse-Z), once per group of four wavelengths, added up, alpha 1 so the
exposure meter counts the sky. The camera sits on the atmosphere's sphere at
its height above the ellipsoid, along the ellipsoid's normal, so horizon and
light are local anywhere on the globe. Checked in the Lab page's new "In the
engine" section: the engine's center pixel against the tables' own probe in
the same direction within 0.1% (noon, sun 20°, 5°, 0°, 4° below, 10 km,
2,000 km), with pictures from the ground through twilight to orbit. Parity
harnesses and the benchmark baseline pin `background: "color"`
(bit-identical to before). Cost: a per-pixel march (32 steps, two groups),
1.3 ns per pixel on an RTX 3000 Ada laptop GPU, about 2.7 ms at 1080p:
the sky-view table (Hillaire's 192 × 108 latitude-longitude sky around the
camera, per frame) is the next step and should cut it to a few hundredths
of a millisecond. The scene's light doesn't follow the sky yet (a sunset
sky over a noon-lit city) until the sun's illuminance and the environment
come from the atmosphere.

**The sky-view table and the sun's light** (r41). Inside the atmosphere
the sky now comes from Hillaire's sky-view table, rendered per view per
frame (192 × 108 directions by zenith angle and azimuth from the sun, rows
packed toward the horizon, columns toward the sun, both wavelength groups
added into one linear sRGB target, pre-exposed), with an extra row for the
sun's radiance through the atmosphere; the sky pass is one lookup per pixel
plus the sun's disk, and lookups stay on their side of the horizon. Above
the atmosphere each pixel still marches (rays that miss the atmosphere
return at once). Against the per-pixel march in the same directions (Lab,
a 16 × 9 grid per shot): sky pixels within 0.2% median and 0.9% worst in
every shot; the bare planet's ground below the horizon differs more at
sunset and twilight (median 6-14%, where its radiance falls by 10⁴ within a
pixel of the horizon), which the globe covers in a scene. Cost at 480 × 270
fell from 0.166 to 0.046 ms, nearly all of it the table (fixed per view).

The scene is now lit by **the sun's light through the atmosphere, per
pixel** (`ViewLighting.sunIlluminance: "atmosphere"`, the default; a number
is still a white sun, lux or unitless). A 256 × 64 table of the sun's
illuminance on a surface facing it, by altitude and the sun's zenith cosine
(packed toward sunsets and low altitudes, with the part of the disk above
the horizon as it sets), built once from the transmittance tables at the 8
wavelengths, in linear sRGB lux; the opaque pass reads it at each pixel's
height above the ellipsoid and the sun's angle to its normal, so mountain
tops keep the sunset after the valleys lose it, and the terminator seen
from orbit is colored. Against the CPU model's direct sunlight (81
wavelengths, double precision) at 0, 2 and 10 km and sun elevations from
90° to 2°: within 0.4% everywhere (115.0 klx at sea level with the sun
overhead, 12.8 klx at 2°, color from white to deep orange). Dyno's Viewer:
"Sunlight from the atmosphere" (on by default), the lux slider otherwise.

**Environment lighting from the atmosphere** (r41;
`ViewLighting.environment: "atmosphere"`, the default; "procedural" keeps
`Engine.environment.setSky`'s gradient, which the 1.x parity harnesses pin).
Each view has an environment probe: its sky rendered into a 128² cube in
the environment frame at the camera (the per-pixel march, cd/m², no sun
disk), then its mips, GGX-prefiltered specular cube and irradiance, rebuilt
when the sun moves about 0.1° in the view's local frame (13 km along the
ground) or the altitude 10% (500 m and below count as 500 m), and copied
into the bound environment before the view's draws (`Environment.select`,
skipped when already there). A body without an atmosphere gets a black
environment.

**Diffuse light from an irradiance cube, not SH9.** The atmosphere showed
what SH9 can't do: against the cosine-weighted integral of the sky's own
radiance over the hemisphere, the engine's SH (equal to an exact CPU
projection within 0.1%, so the pipeline is right) is 3-6% high on a
horizontal surface at the ground under a clear sky, 30% high at 10 km, and
from orbit rings into negative colors (3.9 lux and a negative blue where
the answer is 0), because nine coefficients can't hold a sharp horizon
between a dark sky and a bright planet. Unreal's sky light has the same
limit. Diffuse IBL now reads a 32² irradiance cube: the brute-force cosine
integral of the radiance cube's 16² level (1,536 texels per output texel),
within 0.4-1.4% on the ground, 3.9% at 10 km, exactly 0 from orbit. SH9 is
still computed for reading back and the intent-parity statistics against
1.x. Effects elsewhere: the IBL reference page unchanged (dielectrics within
0.1-2.7% of Monte Carlo, the furnace at 0.9998); the models parity
harness's `ibl-diffuse` mode, which compares with 1.x's SH9, moved by
+0.001 to +0.006 mean FLIP (a deliberate divergence); everything else
bit-identical.

Cost of a rebuild. Measured as separate submits it looked like 10 ms (sky
cube 1.5, mips 0.6, specular prefilter 5.4, SH 0.2, irradiance 2.5), most of
it the GPU idling between a dozen small submissions. Rebuilds are now
encoded in the frame's own command encoder, in a graph pass after the
view's sky-view table, and inside the atmosphere the cube is a lookup per
texel in that table (Unreal's sky light capture) instead of a march, with
the same accuracy (horizontal irradiance within 0.4-1.5% on the ground,
3.9% at 10 km). A 1080p frame of the sky costs 0.64 ms on the GPU, 1.85 ms
when the environment is rebuilt in it: about 1.2 ms per rebuild, affordable
every frame while scrubbing time (§13.13), so the prefilter keeps its 256
samples. Spreading a rebuild over frames stays available if it's needed on
smaller GPUs.

**Aerial perspective** (r41, reworked in r42; `View.aerialPerspective`,
default on with background "atmosphere"). Each froxel or vertex holds the
light the air scatters toward the camera up to its distance (linear sRGB,
cd/m², pre-exposed: haze toward the sun passes fp16's range) and the
transmittance (each channel the 8 bands' average weighted by their color),
marched with the transmittance and multiple-scattering tables. The opaque
pass applies it: lit × transmittance + in-scatter, emission dimmed too. It
replaces 1.x's ground atmosphere and `Fog` for scenes, and the haze meets
the sky at the horizon without a seam (the same atmosphere, the same
tables). Two ways to evaluate it, by the camera's altitude:

- **Near the ground: Hillaire's froxel volume.** 32 × 32 screen directions
  × 128 distances, the same distances for every ray (spaced quadratically
  from the camera, or the atmosphere's nearest point from above it, to its
  far edge past the horizon), built per view per frame by a compute shader:
  a workgroup per column and a thread per slice, each marching its own
  interval (two steps), then a parallel prefix scan in workgroup memory
  chaining the intervals front to back, so each slice is the one before
  plus one interval, as one thread marching the column whole wrote them
  (that left 1,024 threads, 0.20 ms; the scan takes 0.07 ms), one
  dispatch per group of four wavelengths (the second adds
  the first's share). Rays go on through the planet's sphere at its
  surface's air (the scene's surface, the WGS84 ellipsoid or terrain, is
  above it). Each of those choices fixed a banding seen while zooming: rays
  with their own spans put different distances side by side (bands at the
  volume's row spacing); slices marched independently each carried their
  own step error (ripples across the terrain); rays stopping at the ground
  ended their haze at different distances (a step between rays); 32 slices
  over the 1,750 km a high camera sees were too coarse where a ray reaches
  the ground. Checked in the Lab against the tables' own march along the
  same ray to the same distance: median 0.09-0.48%, worst 1.8%, from noon
  to twilight.
- **From higher up: a march per vertex.** From a few kilometers up, at the
  same distance, two neighboring rows' rays are kilometers apart in height
  where they near the ground, where the haze changes fastest:
  interpolating between them drew stripes at the volume's row spacing
  (doubling the rows halved their spacing, which confirmed it). No slicing
  of a screen-space volume fixes that. Above 5 km each vertex marches its
  own ray instead (the opaque vertex shader: 24 steps packed toward the
  vertex, where the air is densest, both wavelength groups at once), as 1.x
  lights distant ground atmosphere; between 2 and 5 km the two blend, and
  above 5 km the volume isn't built. Per pixel the same march cost 4.5 ms
  at 2.6 megapixels (an RTX 40-series laptop GPU); per vertex the whole
  Alps view from 60 km takes 2.6 ms of GPU, against 2.7 ms with the volume.
  Checked in the Lab: the march against the volume, both forced on the same
  frame from 1 km up, median 0.08%, 95th percentile 0.28% over the ground's
  pixels; both within about 1% of the tables' march on the bare ellipsoid.
  Limit: haze interpolates linearly across a triangle, so a large face seen
  from high up (a model's ground plane) gets a smooth approximation.
  Each step's air is at its height above the ellipsoid and its sun angle
  to the ellipsoid's normal, as the ground's sunlight reads its table. At
  first the march used the volume's sphere, which is placed to meet the
  ellipsoid under the camera and is up to 20 km off it across the globe.
  From orbit over the equator, the east and west limbs got under half the
  haze of the north and south (the ground there is 18 km above the
  sphere's surface, in thin air), and the pattern moved with the camera.
  Now the four limbs agree within 10%, from over the equator to 45° S.
  The sky from above the atmosphere had the same flaw: its glow along the
  planet's edge sank behind the ground at the equator and stood off it at
  the poles (2 px each way from 18,000 km). It is now marched in the space
  where the ellipsoid, scaled per axis, is the ground sphere: a linear map
  keeps tangency, so the edge is the ellipsoid's exactly; the shell's
  thickness changes by 0.3% at most, angles by 0.2°. No jump where the sky
  switches from the table (below 99 km) to the march; the Lab's orbit row
  probes in the same space (median 0.0%, worst 8.4%).

Haze within a few hundred meters is coarse in the volume (the first slices
fade in from none); fine for haze, coarse for weather fog (the "weather
haze" medium, an analytic exponential, is the follow-up for that). Other
ways to remove interpolation artifacts, if they come back: jittering the
volume's samples with temporal accumulation (Frostbite's and AC4's
volumetric fog; needs temporal reprojection), and a reduced-resolution
march with depth-aware upsampling (once depth comes before shading, §6's
visibility buffer).

**Haze: visibility and kinds of aerosols** (r42). `Engine.visibility`
(km, meteorological visibility, default 60) sets the aerosols' amount:
extinction at 550 nm is 3.912 / V (Koschmieder), the aerosols' share what's
left after Rayleigh's. `Engine.aerosol` sets what they are: continental
(default), urban, maritime or desert dust, each with an Ångström exponent,
single-scattering albedo and asymmetry after the OPAC climatology, and a
typical scale height (sea salt stays in a shallow marine layer, dust is
lofted kilometers up). Bruneton's reference Earth is gray aerosols at about
220 km. Changing either rebuilds the atmosphere's tables, the sun-light
table and every view's environment (a few ms, once). Seen from the ground
the kinds differ most around the sun (measured near Geneva at noon, the
halo 3-8° from the sun: 26,600 cd/m² in red for maritime, a white halo;
19,400 for desert; 14,200 for continental, bluish; 11,900 for urban, whose
soot absorbs) and by about 5% toward distant mountains. Seen from above
they barely differ (1-2% from 60 km over the Alps): the aerosols are in the
lowest kilometer or two, below the camera and mostly below the Alps, and
only lofted dust reaches high enough to change much. Visibility is the
control with the most visible effect. Dyno's viewer has both (Lighting).

**Correction (r42): globe imagery wasn't lit.** r40 decided imagery is lit
by the sun and sky, and r41 described it as lit, but `GlobeImagery` still
drew it unlit (1.x's way): terrain looked the same at noon and at night,
aerial perspective had no visible effect on the globe, and automatic
exposure misbehaved. Now `GlobeImageryOptions.lit` (default true); the
imagery parity harness and the benchmark suite pin `lit: false`, which
checks decoding against 1.x.

**The Viewer's first frames** (r42) drew with the camera at the Earth's
center, before the app framed anything (a flash of haze at nonsense
distances). It now starts on the whole Earth, as 1.x does.

**How the sun looks** (r41). At ordinary fields of view the disk is 3 to 4
pixels across, so its edge is antialiased by each pixel's coverage. Its
luminance (about 1.6 × 10⁹ cd/m² overhead) is far beyond any exposure that
shows the sky: pre-exposed at EV100 15 it reaches fp16's range and is
clipped (to 30,000 per group), losing the limb darkening and part of its
energy, and tonemapping turns it into a small white dot. What makes the
sun read as the sun in a photograph or to the eye is glare, not the disk:

- **Glare from the sun's energy, analytically.** The sun's illuminance at
  the camera (through the atmosphere) is known exactly, so a post pass adds
  its point-spread function (a camera's or the eye's: a narrow core and a
  wide, faint halo, Spencer et al. 1995) centered on its position, scaled by
  the fraction of the disk that is visible (sampled from the depth around
  it: buildings, terrain, the moon). Exact energy without relying on
  clipped pixels, and the glare dims smoothly as the sun sets behind a
  ridge. The general bloom pass (energy-conserving, Unreal and Frostbite
  style) handles everything else bright.
- **Lens effects as options**: diffraction spikes from an aperture shape,
  ghosts and flares. Looks, not physics; off by default.
- **Eclipses.** The moon's disk (from the ephemeris, at its real angular
  size, or its tileset, §13.14) covers the sun's: the visible fraction of
  the disk, computed per sample point along the sky's march, scales the
  sunlight, so the umbra's 100-odd km darkens the sky overhead while the
  horizon stays lit from outside it (the 360° sunset of totality) with no
  special case. The sun's illuminance on the scene follows the same
  fraction. **The corona** is about a millionth of the disk's luminance,
  visible only in totality: an emissive radial profile (K and F corona,
  falling roughly as r⁻² to r⁻⁶, with streamers as a texture), invisible at
  any other time because the exposure never opens far enough, which is
  exactly what happens with a real camera. Baily's beads and the diamond
  ring come from the moon's limb profile (its terrain).

**Regressions fixed on the way** (r40): wheel zoom slid sideways in split
view (zoom leveled the camera after pinning the target under the cursor;
from b9166e4adf), and the inspector's load time never ended under
photorealistic tiles (it waited for the hidden globe). (r41) The world's
materials table was 64 KB on the GPU while its CPU mirror grew (from
ececae914a): more than 1,024 materials failed every upload. Wheel zoom with
no pick under the cursor aimed at the ellipsoid under it: with terrain below
the ellipsoid (a negative geoid, Philadelphia's ~-33 m) a camera near the
ground is inside it and the ray met it on the far side of the Earth, so one
notch out left for orbit; toward the horizon, a notch moved by a share of
thousands of kilometers. Now the ellipsoid counts only within 20 times the
camera's height above the ground, else the zoom starts on a point on the
cursor's ray at that height (1.x's rule over the sky), and a pick is pulled
at the cursor at once (a wheel can come without pointer moves: an unfocused
window, or the cursor arriving with it) and replaces it when it lands. And a zoom keeps aiming at what is drawn under
its pixel now (a fresh pick each frame while it moves): the target picked
frames ago, on a coarse tile or the ellipsoid under terrain still loading,
made the ground slide sideways past it as finer tiles came in. Seen from
far away, the atmosphere's rim (a pixel or less) is now sampled with 8 rays
across its width.

**Next phase after lighting: visual regression tests.** Golden images
for canonical scenes and lab pages (2.0 against its own approved images,
separate from parity with 1.x), FLIP-thresholded, run with the lab runner
and on demand from Dyno, with approving a new golden as an explicit step.
Both regressions above would have been caught by a scripted interaction
(zoom toward a point in split view) plus an image or numeric check.

Decided (r40):

- **Exposure**: a fixed daylight EV100 by default (about 15, the "sunny 16"
  rule), with automatic exposure as an option.
- **Globe imagery is lit by the sun and sky** by default (2.0's globe
  material already is; 1.x's isn't). Imagery has no physical units: tiles
  are 8-bit sRGB, display-referred photographs or composites, color balanced
  and contrast stretched for appearance, with the capture's sun shading,
  shadows and haze baked in. 2.0 decodes them with the exact sRGB curve and
  uses the result as the surface's albedo, an estimate. So the lit globe
  needs a calibration (scaling imagery to plausible albedos: land averages
  about 0.1 to 0.3) and care with double shading (terrain normals add only
  the low-frequency shading the imagery lacks). Imagery published as
  surface reflectance (Sentinel-2 L2A, for example) would be true albedo.
  The exact-parity tier keeps an unlit mode, which checks decoding against
  1.x.
- **No equivalents** of 1.x's environment color processing (brightness,
  saturation, gamma, HSB shifts) for now.

## 5. Performance methodology

- **Scripted flythroughs** recorded in 1.x and replayed in both, cold and warm cache.
- **A multi-view scenario**: N 1.x viewers vs N views on one engine.
- **Metrics**:
  - main-thread CPU ms/frame (p50/p95)
  - GPU ms/frame, via `timestamp-query` with Chrome's developer flag set in Playwright
  - JS→GPU calls per frame
  - GC bytes per steady frame
  - tiles/sec to visible
  - time-to-full-detail
  - GPU memory, including the multi-view memory ratio
  - long tasks over 50 ms
  - Dawn indirect-validation overhead
- **Targets** (revised after M0 baselines):
  - ≥3× lower main-thread CPU per frame
  - 0 steady-state allocations
  - ≥2× faster time-to-full-detail
  - GPU time ≤ 1.x
  - N views well under N× memory
- Automated in Playwright + Chromium with WebGPU, with JSON results per commit.
- **The benchmark suite** (§16) turns this into a repeatable comparison of
  1.x and 2.0 over a catalog of real scenes, public and private, and is
  designed to grow into a benchmark suite for Cesium as a whole.

---

## 6. Milestones

Durations are rough and **optimistic** for one engineer with AI assistance. If time runs short, the droppable items are listed under §7.

### M0 — Foundations and de-risking spikes (≈3 wks)

- Scaffold `packages/next`, the GPU layer and the frame-graph skeleton.
- **Spikes**:
  - multi-view skeleton covering all four target kinds (split, second canvas, offscreen, a `ViewLink` overview), plus the view-agnostic bundle trick
  - Slang (§3.4 checks)
  - **hi/lo precision on Metal**
  - **MSAA feature-ID sample-0 resolve**
  - Dawn indirect-validation overhead
  - `OffscreenCanvas` worker smoke test
- Reverse-Z camera; L0 parity; parity harness shell; 1.x baselines for H1–H10.
- _Exit_: a lit cube on the globe's ellipsoid in two views matches 1.x within L2. Slang, OIT and target-format decisions are recorded.

### M1 — GPU-driven glTF rendering (≈3–4 wks)

- WorkerPool and decoders; geometry arenas with vertex pulling.
- **Final draw-record format**, designed with the globe and imagery-slice needs included.
- Material table plus `TextureHandle`; unlit and PBR, IBL spherical harmonics, sun.
- **Per-tile bundles + indirect args + draw-prep/frustum kernel.**
- Compute mips; async pipelines; feature-ID pick.
- **Zero-allocation CI gate.**
- _Exit_: Khronos sample models and a CAD glb pass L2 against 1.x `Model`.

### M2 — Unified streaming plus 3D Tiles (≈3–4 wks)

- `TileSource`, SoA tile table, `Stepwise` policy, RequestScheduler with ion and P3DT auth, engine-wide cache with per-view tracking, b3dm unwrap.
- First cut of the `Budgeted` policy: skip-LOD and budget-driven refinement.
- _Exit_:
  - OSM Buildings, the CAD tileset and photogrammetry stream.
  - `Stepwise` L1 ≥99% in two views.
  - `Budgeted` L1′ is measured.
- _Status (r23)_: exit met (100% L1 in two views; L1′ fast and throttled,
  three moves, photogrammetry and design models). Closing out before M3:
  adaptive request concurrency (in progress), a `TileSource` abstraction so
  terrain and imagery share the scheduler, cache and per-view selection, and
  one engine-wide cache budget. Moved to the planned `Budgeted` selection work (after M3): the SoA tile
  table and budget-driven refinement.

### M3 — Globe (≈3–4 wks)

- Quantized-mesh terrain; horizon culling (in selection since r25).
- Imagery sources plus the **texture-array composite cache**.
- Height queries and clamping (r29).
- Closed out in r31 (§15, increment 6): model instancing and i3dm, the
  100,000-instance benchmark, runtime tileset `modelMatrix`, the viewer's
  city clamped, `sampleHeightMostDetailed`. Clamping billboards and labels
  moves to real-time tracks (§13.11), with the billboards themselves.
- **Status: M3 complete (r31).**
- _Exit_: the CAD tileset sits on Cesium World Terrain with ion imagery; globe `Stepwise` L1 ≥99%.

### Benchmark suite v1 (after M3)

The §16 foundations, enough for first 1.x vs 2.0 numbers on
representative content; it then guards every later milestone.

- The dataset, scene and scenario schemas; the public manifest in the
  repo and private manifests outside it; `fetch` and `verify` (checksums)
  into a local content-addressed store.
- The engine adapter interface with a 1.x adapter (this repo's build,
  pinned) and a 2.0 adapter; the existing harnesses (`baseline`, `hitch`,
  `lod`, `trace`) move onto it.
- 10-15 scenes across the three catalog groups (§16.4), cold and warm,
  unthrottled and one throttled profile.
- A report per run: each metric per scene, 2.0 against 1.x with
  confidence intervals, and the environment fingerprint; a runner page
  and a results page with comparisons and trends (§16.5).
- The first phase of §16.9: lap overlays with delta traces and track
  maps, filmstrips with parity, frame-time percentile curves and stutter
  metrics, request waterfalls, a validity verdict per run, a scorecard
  with declared primary and guardrail metrics, and the tracking
  workspace with annotations and control bands.
- _Exit_: one command fetches, verifies and runs the public catalog (and
  a private one when its manifest is present) in both engines and writes
  the report; two runs on the same machine agree within their intervals;
  a regression planted in a commit is visible in the workspace and
  explained by the report (where on the path, which frames, which
  requests).

### Budgeted selection: planned work (after M3)

In order (r37). First the findings from the r37 baseline (§16.7), so each
change after them is measured against a guardrail:

- **Image guardrail (done r37)**: selection parity, `Budgeted` against
  `Stepwise` on the same renderer (the settled end view captured under both
  after every measurement; FLIP at most 0.1 per scene, counted with the
  guardrails). Calibrated: untextured scenes 0.001 to 0.008, textured
  0.04 to 0.08 (Melbourne 0.083, to look at); Rainier's under-refinement
  was about 0.3. FLIP against 1.x can't tell: lighting and sky alone put
  most scenes at 0.3 to 0.55. _r37_: Rainier's 0.055 was not texture
  noise but a real patch (below, free detail on terrain); 0.009 since.
- **Free detail on terrain (fixed r37)**: after the orbit, Rainier's end
  view showed a hazy, snowless patch on the south flank that a direct load
  of the same view didn't. Terrain selection and imagery were both
  correct for the tiles drawn: `Budgeted` drew level-12 tiles left in the
  cache by the orbit (free detail, `opportunisticRatio` 0.25) where a
  direct load and `Stepwise` draw level 11, and Bing's level 12 there is
  a different, hazy capture. A still view looked different depending on
  where the camera had been. The globe now takes no free detail by
  default (`opportunisticRatio` 0; 3D Tiles keep it), and 0 now disables
  it on every path. Rainier: selection parity 0.055 → 0.009, quality in
  motion 0.062 → 0.026 (1.x 0.025); OSM Philadelphia 0.008 → 0.004;
  settle, resettle and bytes unchanged.
- **Terrain loading (done r37)**: `Budgeted` expanded a terrain tile
  only once it loaded, so terrain loaded one level per round trip and
  never skipped levels (the waterfalls' curve: 2 to 4 terrain requests in
  flight for seconds where 1.x has 18). It now expands tiles as it visits
  them, as 1.x's quadtree does. The benchmark adapters set up imagery,
  terrain and tilesets in parallel (2.0's waited on each, about a second).
  Measured (3 reps, against the r37 baseline): Rainier settles in 4.3 s
  (was 6.5 s; 1.x 5.8 s) loading 13.5 MB (was 4.3 MB under-refined; 1.x
  13.1 MB); OSM Philadelphia 4.9 s (was 7.7 s; 1.x 4.4 s), 23.3 MB (was
  26.6 MB). Selection parity unchanged (Rainier 0.059, Philadelphia 0.008,
  NYC 0.002).
- **Startup latency**: 2.0's first request starts 150 to 550 ms after
  1.x's in every scene (engine and device setup come before the first
  endpoint request), and NYC's first content request waits about 300 ms
  after the tileset JSON arrives, where 1.x's starts with it. Start
  resolving endpoints while the device is created; issue root content in
  the frame the tileset JSON arrives.
- **Hitches on uncapped orbits**: NYC 8 per run over 100 ms on 2.0 (1.x
  none), as in the baseline (Google Manhattan 3 to 6, Melbourne 6 to 14,
  Tokyo 6 to 10). Content arriving faster than the uncapped frame loop can
  upload; see H6 and the hitch harness.
- **Requests by purpose (done r37)**: each tileset counts requests and bytes by what
  they are for, `Budgeted`'s priority bands: base (a first coarse level),
  intermediate (steps between skipped levels), view (the frontier) and
  prefetch (the guard band). The inspector shows them (a stacked bar in
  Streaming, prefetch share in its history); waterfalls tag each request so
  scene pages can color by purpose.
- **Over-fetching on 3D Tiles**: NYC ×3.2 and OSM Philadelphia ×1.5 the
  bytes of 1.x with settled images that match its selection (0.002, 0.008):
  until settled, 155 tiles (7.5 MB) to 1.x's 74 (3.8 MB), so not drawn
  content (prefetch, base and intermediate requests); during the orbit
  another 119 (6.1 MB) to 1.x's 5, which defers requests while the camera
  moves (`cullRequestsWhileMoving`). Bound the prefetch band and loading in
  motion by their benefit, against the image guardrail.
  _r37, by purpose_ (requests now tagged): NYC's extra bytes are prefetch
  during the orbit (170 requests, 8.4 MB; no view requests were needed,
  prefetch had loaded what came into view), and only 145 of 312
  prefetched tiles were ever drawn (Philadelphia 31 of 110). The fixed
  guard band (tangents ×1.25 on all four sides) loaded the top and bottom
  bands an orbit never reveals. **Prefetch ahead of motion (done r37)**:
  the engine measures each view's camera velocity and prefetches the view
  it will have 1 s ahead (margin ×1.1; just the margin while still). NYC
  312 → 226 prefetches with the same 145 drawn, 13.9 → 10.9 MB;
  Philadelphia 37 drawn of 94; selection parity, settle and resettle
  unchanged. What remains (NYC ×2.6 of 1.x) is mostly content 2.0 draws
  during the orbit and 1.x never loads: a choice of quality in motion
  against bytes (§8 product choices), not waste.
- **Quality in motion (done r37)**: the image guardrail compares settled
  views only, so it can't see what loading in motion buys. After the
  measured runs, each engine replays the motion in a fresh context (cold
  cache, vsync, the same pace; nothing timed) and copies the canvas as
  drawn at 8 evenly spaced points (`createImageBitmap` in the frame's
  task, so loading isn't paused), then settles at each of those poses and
  copies it again. FLIP between the pair is what motion cost the image
  (0: drawn in motion as settled; renderer differences cancel). Scene
  pages show the frames with their settled pair and heatmap; the CLI
  prints the table; summaries and Analysis carry `motionFlip`. First
  results (r37, two reps):

  | Scene            | 1.x   | 2.0   |
  | ---------------- | ----- | ----- |
  | NYC              | 0.030 | 0.008 |
  | OSM Philadelphia | 0.012 | 0.011 |
  | Rainier          | 0.025 | 0.062 |
  | Aerometrex SF    | 0.014 | 0.031 |
  | Flight (below)   | 0.166 | 0.153 |

  NYC confirms what prefetch ahead buys (sharp in motion where 1.x defers
  requests). Rainier looked worse in motion (0.062), but its settled
  frames carried free detail the orbit had cached (above); 0.026 since,
  as 1.x. Aerometrex loses its first frame (0.09) and matches after.
  **Next**: bound
  loading in motion by benefit: a tile whose expected time on screen is
  shorter than its load time is not worth requesting (1.x's
  `cullRequestsWhileMoving` is the special case of 60 frames' travel
  against the tile's diameter), checked against both image metrics.

- **Big camera moves (r37, measuring)**: a scene flies 1.x's
  `camera.flyTo` path (CameraFlightPath in 3D, its defaults: up to a
  fifth of the framing altitude on a flat-topped curve, quintic easing,
  at most 3 s) from street level in Philadelphia to Tokyo over OSM
  Buildings on terrain, about 2,900 km up, the sun over the camera
  (`flight-philadelphia-tokyo`; camera script `flight`). Waterfalls now
  mark the motion and split requests before, in and after it. Two reps:
  - _In flight_ (3 s): 1.x 271 requests, 2.1 MB; 2.0 685, 8.5 MB (imagery
    234 to 71, terrain 430 to 196, 3D Tiles content 9 to 2, tileset JSON
    12 to 2). Uncapped, 2.0 434 requests, 4.9 MB.
  - _After arrival_: 1.x 138 requests, 11.2 MB (107 of them imagery);
    2.0 25, 9.9 MB, having loaded Tokyo's imagery and terrain during the
    descent. Tokyo settles after 1.4 to 1.6 s on 1.x and 1.1 to 1.6 s on
    2.0 (vsync); uncapped 2.8 s on 1.x, 0.9 s on 2.0. Totals +27% bytes.
  - _In motion_: alike (0.17 and 0.15); both draw only the coarsest
    levels near arrival (0.6 at 94% of the flight) and space at the top
    (the end pitch, −35°, is kept the whole way, as flyTo does).
  - Nothing was cancelled: 3D Tiles and terrain cancel a request only
    after 30 frames untouched, and most loads finish sooner; imagery
    sources are never cancelled once requested. **Next**: what 2.0
    fetches in flight that is never drawn (purpose stats for imagery
    too), cancellation for imagery, and whether the descent's loads or
    the 3 s flight's prefetch (1 s ahead at thousands of km/s) are
    worth their bytes; a slower flight (`seconds`) and a flight between
    3D Tiles cities with no globe.

- **Untextured terrain while zooming out (fixed r37)**: 2.0 drew a
  terrain tile as soon as its geometry arrived, with its own imagery or an
  ancestor's within 8 levels, else untextured: zooming out fast over
  Rainier (3 km to 600 km in 0.25 s) drew up to 31 gray tiles in a frame.
  As 1.x (`GlobeSurfaceTile.processImagery`), a terrain tile is now
  drawable only with imagery, its own or a stand-in ancestor's; until
  then what was drawn stays (finer cached tiles, or the ancestor), and
  its imagery loads (`SelectionResult.waiting`, both policies). Stand-in
  slices count as used, so a composite can't evict one a drawn tile is
  borrowing; placeholders get imagery too. Zoom-outs from 1.5 s down to
  0.15 s (×1000): no untextured tile in any frame. Rainier, OSM
  Philadelphia and the flight: settle 4.3, 4.3 and 4.3 s (1.x 6.0, 4.8,
  4.6), Tokyo after the flight 0.9 s (was 1.3; 1.x 1.5 to 2.1); bytes,
  selection parity and quality in motion unchanged. First content on
  Rainier waits for imagery too (2.7 to 3.1 s; 1.x 2.1 to 2.2).
- **Imagery captures in motion**: Bing's levels are different captures on
  Rainier (bluish ice, hazy level 12), so a tile drawn with a stand-in
  ancestor's imagery while its own loads shows a different capture for a
  moment. Both engines do (32 frames of the orbit: 1.x 0.022, 2.0 0.023,
  bumps at the same moments; 2.0's at 33% covers more of the summit).
  `--motion-samples` sets the frames per replay (default 8).
- **Dyno's guardrails, after tuning `Budgeted`**: some comparisons with
  1.x now measure product choices rather than regressions (bytes for
  loading in motion and prefetch, JS heap, terrain free detail). Revisit
  the plan's guardrails and their tolerances per scene once `Budgeted`
  settles, so a verdict means what it says.

_r38 (overnight, toward the L1′ exit check)_:

- **FLIP on the GPU (done r38)**: `parity/flipGpu.ts`, a WebGPU compute
  port of `parity/flip.ts` (separable filters as passes, per-workgroup
  sums and a histogram for mean and percentiles). Same mean as the JS
  reference to 5 decimals (per pixel within 2e-4) at 4 to 8 ms a
  comparison instead of 220 to 310. Benchmark filmstrips and the L1′
  loop use it; in L1′ the JS FLIP ran on the main thread every 500 ms of
  the very loading it measured.
- **The exit check as a matrix (done r38)**: `bench/lod-matrix.mjs` runs
  L1′ for Stepwise and adaptive Budgeted over five datasets
  (photogrammetry: Google Midtown, Aerometrex SF; OSM Philadelphia;
  design models: BIM and AEC samples) on a fast link and the throttled
  one (20 Mbit/s, 80 ms), with repetitions (`--reps`; single runs vary
  by up to 0.03 in FLIP avg) and re-scoring (`--summarize`). A cell
  passes where Budgeted's FLIP average is no worse (within 0.002) at no
  more bytes downloaded (within 2%; L1′'s "MB" column was GPU upload).
  L1′ rows record requests and bytes by purpose.
- **FLIP against the target (r38)**: the fully refined reference (SSE 2)
  rewards lingering on content that happens to look more like SSE 2 than
  the image both policies settle to. Zooming out on AEC, Budgeted reaches
  the target in 500 ms and Stepwise after 1 s, yet Budgeted scored worse
  (the finer content still drawn resembles SSE 2); BIM's SSE-16 tiles
  drop an element its coarse tiles keep, so settling sooner scored worse.
  L1′ now also measures FLIP against the target (Stepwise settled at the
  default SSE), samples every 100 ms (500 ms decided whole averages by
  whether a sub-second move had converged at the one sample), and the
  exit check judges on the target metric, showing both.
- **Prefetch only ahead of real motion (done r38)**: a still camera
  prefetched a 1.1× margin around the view; on a jump into OSM
  Philadelphia 13 prefetches were half of Budgeted's bytes (21.6 MB to
  Stepwise's 11.3) and, throttled, delayed what the view showed (settle
  8.1 s vs 3.6). Prefetch now needs steady motion: a camera set somewhere
  else in one frame (a teleport, a flight's end) read as thousands of m/s
  and prefetched far from the view. Budgeted's prefetch requests also wait
  until no visible request of the tileset is queued or in flight
  (`prefetchAfterVisible`; 1.x's preloads go out with the rest). OSM:
  11.3 MB both, throttled FLIP avg no worse.
- **Partial resident cover (done r38)**: a missing frontier tile draws
  whatever resident finer content lies under it (tiles count loaded
  descendants, `residentBelow`), instead of nothing unless every visible
  child is resident.
- **Startup (done r38)**: `Viewer.create` resolves the default globe's
  imagery and terrain endpoints while the device is created, and both at
  once; the benchmark adapter does the same for every dataset. NYC's
  first request now leaves at 0.50 s (was 0.90; 1.x 0.46) and its first
  content request 0.17 s after the tileset JSON (was 0.29). Settle
  (cold orbit, two reps): NYC 3.0 s (was 3.5 to 3.7; 1.x 3.1), OSM
  Philadelphia 4.1 s (was 4.3; 1.x 4.7), Rainier 3.9 s (was 4.4; 1.x 6.0).
- **Loading in motion by benefit (done r38)**: while the camera moves,
  Budgeted doesn't request a tile (frontier, intermediate or prefetch)
  whose time on screen, the field of view over how fast it crosses it, is
  shorter than the tileset's median load time (`motionBenefit`, default
  1). Only motion across the line of sight counts (a tile straight ahead
  of a camera flying toward it stays in view), less the camera's turning
  as vectors (|−v⊥/d − ω × u|: an orbit's target stays still on screen;
  adding the two as speeds first made near content look fast). Views carry
  their steady motion, tilesets their recent load time. 1.x's
  `cullRequestsWhileMoving` is the crude case. Slow orbits are untouched
  (NYC 10.9 MB, quality in motion 0.008 vs 1.x 0.030).
- **Imagery requests (done r38)**: globe imagery counts requests, bytes,
  drawn and cancelled (an Imagery row in the inspector's purposes and in
  run metrics) and cancels sources no wanted tile has needed for 30
  frames. Flight Philadelphia–Tokyo: 31.7 → 25.9 MB (1.x 24.7), quality
  in motion unchanged (0.149 vs 1.x 0.164). Nothing was cancelled on a
  fast link (loads finish inside the 30 frames); the savings come from
  not requesting in motion.
- **Dyno's guardrails (retuned r38)**: the default plan depends on what
  is compared. 2.0 against 1.x judges what should match: time to settle,
  frame p95, hitches, and bytes until settled (`bytesLoad`: requests
  started before the motion); bytes in and after motion and the JS heap
  are product choices there, reported but not judged. 2.0 against 2.0
  judges them all. Quality in motion is an image guardrail beside
  selection parity: the candidate's may not be worse than the baseline's
  by more than 0.01 per scene. Re-summarized runs that stored the old
  default plan get the new one (runs before r38 have no `bytesLoad`).
- **No free detail by default (done r38)**: Google Manhattan's quality in
  motion was 0.046 to 1.x's 0.026 (the new motion guardrail broke) with
  the motion bound on or off, prefetch at full detail or none, and at
  r37's commit too. The cause was free detail: after the replay's orbit
  filled the cache, each settled reference drew cached tiles up to two
  levels finer than its view needs, so in-motion frames were scored
  against an over-refined image, and a still view depended on where the
  camera had been (as Rainier's patch on terrain). `opportunisticRatio`
  now defaults to 0 for 3D Tiles too: quality in motion 0.020 (1.x
  0.026), selection parity 0.066 → 0.024, bytes unchanged. Zooming out,
  resident finer content still stands in while the coarser tile loads.
- **JS heap (r38, partly done)**: 2.0's main-thread heap is 2 to 6 times
  1.x's in every scene (NYC 172 to 331 MB vs 54). A heap snapshot of NYC
  settled (36,176 tiles known, 176 loaded): the bulk is per-tile
  bookkeeping for tiles never loaded. About 10 small Float64Arrays per
  tile (a region volume's corners, normals and box; each its own
  ArrayBuffer): 377k typed arrays and as many ArrayBuffers. Volumes are
  now compacted into one buffer each (ArrayBuffers 377k → 90k, heap 217
  → 200 MB); the views remain (23 MB), as do 6 to 7 MB each of Tile
  objects, plain objects, heap numbers and short strings. Tiles also keep
  content URIs relative (resolved on use) instead of each carrying the
  tileset URL's query. A cheaper step first: build volumes lazily (keep the 6 or 12 numbers from the JSON; corners, normals, box and sphere on first use, which most of NYC's 36k tiles never see; `childrenWithinParent` and `childrenPartition` on first use too). The real fix is the SoA tile table (§13.7): one
  Float64Array per tileset for every volume. (A 32 MB external string
  in the snapshot is the benchmark page's script source, 1.x's
  unminified build, loaded for both engines.)
  _r39_: volumes are built lazily (`Tile.volume`, content and request
  volumes, the children checks and `headerKey` on first use). Snapshot
  against snapshot, after the orbit, JS heap after full GC: NYC 23.2 →
  15.2 MB, Tokyo 242 → 83 MB, Google Manhattan 123 → 78 MB (1.146.0: 43,
  535, 310); Tokyo's buffers 86 → 49 MB (each volume's packed array was
  an ArrayBuffer). The "2 to 6 times 1.x" above was the metric:
  `performance.memory.usedJSHeapSize` didn't move with a full GC and
  counted ArrayBuffer storage with the main thread's objects (NYC: 93 MB,
  of which 21 MB objects and 64 MB buffers). The suite now reads both
  over CDP, main thread and workers, after full collections (`heapBytes`,
  `bufferBytes`). What remained was buffers: 2.0 held 68 MB on NYC and 73
  MB on Tokyo to 1.x's 13 and 16 (production builds). Heap snapshots of
  the main thread and the workers on NYC (the workers hold 0.5 MB each):
  - **The benchmark page**: it loaded this repository's unminified 1.x
    build on every run, 2.0's too (the note above): 23 MB of the buffer
    count (its source text) and 5.6 MB of JS heap. 2.0 pages now load no
    1.x; snapshots of 2.0 at older refs get an empty one (an annotation
    on the trend charts marks it).
  - **The World's CPU tables**: records, transforms (float64 local and
    world matrices), instances and materials were allocated at full
    capacity, and the suite's world has 65,536 draws: 37 MB, nearly all
    empty. They now start at 1,024 rows and double as slots are used;
    the GPU tables stay full size.
  - **The upload copy buffer** kept its peak (4 MB after NYC's load).
    Queued geometry is now written straight into staging buffers mapped
    at creation (1 MB or the write's size), destroyed after each flush:
    nothing stays between bursts, and one copy of every upload is gone.

  Quick tier, cold start, against 1.146.0 (median MB, main thread and
  workers): NYC buffers 3.1 (1.x 12.3), Tokyo 7.3 (15.9), Google
  Manhattan 2.2 (8.8); JS heap 12.8, 70.7, 38.6 (41.2, 371, 187). NYC
  against HEAD over 6 repetitions: buffers −93%, time to settle and
  first content unchanged; lab parity images identical.

- **Hitches with vsync off (fixed r38)**: a CPU profile of NYC's
  uncapped orbit: the 100 to 300 ms stalls are not script. The main thread
  waits in `getCurrentTexture` (1.4 s of them) and `queue.writeBuffer`
  (0.9 s), the GPU's backlog. The upload and tree-build budgets were per
  frame and grew while frames were "on time", which at 500+ frames a
  second meant gigabytes a second. Each update now gets the budgets'
  share of a 60 Hz frame by the time since the last one; with vsync
  nothing changes. That is sound but did not remove the hitches (NYC
  uncapped still 4.5 per run; settle a little better, 3.3 s and OSM 3.8 s
  vs 3.7 and 4.2). What a second profile and the waterfall show: the two
  hitches come at the same moments of the orbit (1.5 s and 4.6 s), when
  bursts of prefetched tiles arrive (5 to 7 within 100 ms, none larger
  than 130 KB); most of each 200 to 300 ms interval passes outside
  `frame()` (the next animation frame comes late: the GPU process is
  behind), and the main thread's busiest call is `queue.writeBuffer` for
  mesh uploads (1.2 s over 8 s). A trivial uncapped WebGPU loop in the
  same browser never stalls (79k frames, worst 17 ms). **The fix**: a
  `queue.writeBuffer` per stream of every mesh went through the browser's
  transfer ring to the GPU process; `World` now copies writes into a CPU
  staging area when queued and puts them in place, before anything reads
  the arenas (the frame, ray casts) or reuses their ranges, from one
  mapped staging buffer with buffer-to-buffer copies. Profile: no frame
  over 80 ms (was 2 to 5), busy stretches over 80 ms 28 → 5. NYC and OSM
  Philadelphia, vsync on and off, two reps: no hitches (NYC 4.5 → 0), and
  the scorecard against 1.x passes with no guardrail broken.
- **The full catalog (r38)**: every scene, cold and uncapped orbits, two
  reps, 1.x against 2.0 after the changes above. CPU per frame −73%
  (geomean), settle −26%, frame p95 −56%, bytes until settled −5%
  (Google −37%, Melbourne −49%, Aerometrex −54%); quality in motion no
  worse anywhere (Japan 0.018 vs 0.046, NYC 0.008 vs 0.030). Point
  clouds, splats and vector tiles are still unsupported in 2.0; 1.x
  doesn't draw the instanced fleet. The scorecard failed on two
  guardrails, both older than tonight (bisected with snapshot engines):
  BIM's settle (+20%, its first content 0.25 s later since
  `45f86b9e68`) and hitches with vsync off on AEC and Japan (since
  `68328f878f` or earlier). Both are fixed below; the rerun of those
  scenes passes.
- **KTX2 uploads and content origins (fixed r38)**: a CPU profile of
  AEC's uncapped orbit. `writeTexture` of transcoded KTX2 levels blocked
  the main thread for up to 0.5 s under a GPU backlog (the `writeBuffer`
  stall again), and request order parsed two URLs per wanted tile per
  frame (0.5 s over the load) since content URIs stay relative. KTX2
  levels now go through one mapped buffer and `copyBufferToTexture`
  (rows padded to 256 bytes; images unchanged); a relative URI's origin
  is its base's, looked up once per base. AEC uncapped hitches 3 → 2,
  Japan 6.5 → 4.5 (1.x 1 to 2; what remains is during Japan's load).
- **The ellipsoid's expansion (fixed r38)**: since terrain expands tiles
  as it visits them, the ellipsoid (which has every tile) expanded
  everything visited in one startup frame: 0.5 s of `Tile` construction
  before a design model's first request. It now expands within 4 ms per
  selection pass, beyond which tiles expand when they load (its tiles
  are generated, so expanding ahead saves no round trips); terrain keeps
  expanding freely (budgeting it too slowed OSM's settle by 0.5 s).
  Three reps: first content BIM 0.73 → 0.47 s, NYC 1.95 → 1.30 s (1.x
  0.55 and 1.57); settle BIM 1.80 → 1.47 s, NYC 3.38 → 2.83 s (1.x 1.54,
  3.05). Still open: on terrain 2.0's first content comes later than
  1.x's (Rainier 2.7 to 3.2 s vs 1.6 to 1.9, OSM 2.1 vs 1.5) though it
  settles sooner. Not the terrain-waits-for-imagery rule (Rainier 2.5 to
  2.7 s just before `2bd5d85d21`, 2.6 to 2.7 at it, 2.4 to 2.9 now): 2.0's
  has been about 2.5 s since r37 while 1.x's ranges from 1.6 to 3.0 s
  between sessions (it was level in the r37 baseline). The waterfall
  (Rainier, same session): 2.0 requests `layer.json` at 1.37 s to 1.x's
  0.99 (the benchmark adapter adds terrain only once every endpoint,
  Bing's imagery metadata included, has resolved), so its first terrain
  requests leave 0.6 s after 1.x's; and then 66 at once, mostly
  intermediate levels, where 1.x sends 10 before its first content. Next:
  add terrain as soon as its own endpoint resolves (imagery attached when
  ready), and let the root levels' requests go first.
  _Fixed (r39)_: the burst was not the cause (2.0's level 0 tiles take the
  same 230 to 330 ms on the network as 1.x's). Three waits were: terrain
  added only after every endpoint resolved; a tile's imagery requested
  only once its terrain had loaded (about 0.4 s; 1.x requests both at
  once, imagery needing only the rectangle); workers created on the first
  request. Terrain now starts on its own endpoint (adapter and `Viewer`),
  the globe's tiles load while imagery resolves (`GlobeOptions.imagery`
  takes a promise; nothing is drawn without imagery), imagery is wanted
  for loading tiles after drawn ones (not prefetch), and `warmUp` starts
  the workers. First content, median of 3 (ms):

  | Scene · scenario        | 1.146.0 | r38  | r39  |
  | ----------------------- | ------- | ---- | ---- |
  | Rainier · cold          | 1944    | 2561 | 1731 |
  | Rainier · uncapped      | 2754    | 2825 | 1721 |
  | Philadelphia · cold     | 1353    | 2185 | 1624 |
  | Philadelphia · uncapped | 2175    | 2041 | 1361 |
  | Tokyo · cold            | 2726    | 3108 | 2176 |
  | Tokyo · uncapped        | 3607    | 3011 | 2214 |

  Philadelphia cold varies widely in both engines (1.x 1287 to 2718, 2.0
  1361 to 2452).

- **The L1′ exit check (r38)**: the final state (commit `4d94c22c95`:
  no free detail, staging uploads, the ellipsoid's expansion budget),
  three repetitions per cell, FLIP against the target (lower is better),
  bytes downloaded. A cell passes where Budgeted's FLIP is no worse by
  more than 0.002 plus twice the standard error of the per-repetition
  difference (repetitions vary: a throttled jump into OSM ran 0.29 to
  0.44 for either policy), at no more bytes; better where lower by more
  than that:

  | Content           | Link | FLIP S → B    | Δ ± margin     | MB S → B    | Verdict |
  | ----------------- | ---- | ------------- | -------------- | ----------- | ------- |
  | Google Midtown    | fast | 0.129 → 0.053 | −0.077 ± 0.014 | 69.1 → 40.7 | better  |
  | Google Midtown    | slow | 0.127 → 0.096 | −0.031 ± 0.005 | 69.1 → 40.7 | better  |
  | Aerometrex SF     | fast | 0.064 → 0.015 | −0.049 ± 0.016 | 6.1 → 1.4   | better  |
  | Aerometrex SF     | slow | 0.093 → 0.023 | −0.070 ± 0.003 | 6.1 → 1.4   | better  |
  | OSM Philadelphia  | fast | 0.096 → 0.006 | −0.090 ± 0.037 | 11.3 → 11.3 | better  |
  | OSM Philadelphia  | slow | 0.136 → 0.124 | −0.012 ± 0.011 | 11.3 → 11.3 | better  |
  | BIM design model  | fast | 0.015 → 0.000 | −0.015 ± 0.002 | 62.6 → 37.4 | better  |
  | BIM design model  | slow | 0.019 → 0.011 | −0.009 ± 0.002 | 62.6 → 37.4 | better  |
  | AEC design + site | fast | 0.006 → 0.010 | +0.004 ± 0.003 | 12.5 → 12.5 | fail    |
  | AEC design + site | slow | 0.016 → 0.021 | +0.005 ± 0.006 | 12.5 → 12.5 | pass    |

  Nine of ten pass, eight better (two repetitions at `09c78b3fbb`, before
  the later fixes: nine of ten, seven better, with AEC failing on the
  throttled link and passing on the fast one). Settle times are as fast or
  faster everywhere (Google 2.3 vs 4.1 s fast, 23.0 vs 35.8 s throttled).
  AEC is the one gap, about +0.004 to +0.005 on either link, and which
  link's cell fails changes between runs: it sits at the margin. On the
  throttled link both policies request the same 113 tiles zooming out, and Stepwise draws the complete coarse
  parent until a region completes where Budgeted holds the finer tiles it
  has. The hold (kept for pans, so a new edge doesn't collapse a region
  to a near-root tile) now applies only while at most half a region's
  visible children are missing: zoom-out FLIP 0.046 → 0.035 (Stepwise
  0.028); a quarter was worse (0.045, pans too). What remains is likely
  the request order on a FIFO link (coarser tiles first would complete
  regions sooner, but would put near, fine content behind far, coarse
  tiles in oblique views): part of budget-driven refinement below.

Then the planned work:

- Budget-driven refinement (benefit per byte, §13.3), which is also the
  slow-link answer from the throttled L1′ runs.
- Multi-view priority and view weights; fair queueing of an origin's window
  across tilesets and views (§13.2, §13.4).
- Silhouette weighting for design models; GPU coverage feedback from the
  HZB (§13.5).
- Traversal in a worker over a transferable SoA tile table (§13.7).
- Paging lessons: thrashing rate, working-set or ARC-style eviction, and a
  prefetch band sized by its hit rate (§13.2, §13.6).
- A second photogrammetry city in L1′ (done r38: Aerometrex SF beside
  Google Midtown); network profiles from real-user data (follow-up 6;
  synthetic profiles until that data exists: fast, and 20 Mbit/s with
  80 ms).
- _Exit_: `Budgeted` beats `Stepwise` on FLIP avg at equal or fewer bytes on
  both fast and slow links, across photogrammetry, OSM and design models.
  _r38_: 9 of 10 cells, 8 better (`bench/lod-matrix.mjs`, three
  repetitions, FLIP against the target); AEC trails by about 0.004 on
  either link, at the margin (see the table above).

### M4 — Visual parity (≈3 wks)

- Lighting and shading as designed in §4.2: physical units and exposure,
  Hillaire's atmosphere (sky, aerial perspective, environment lighting),
  shadows and ambient occlusion.
- LDR/HDR paths, FXAA.
- Translucency: MBOIT real-time path plus the per-pixel-linked-list exact reference; tested for opaque/translucent interaction against the reference, not against 1.x.
- _Exit_: L2 on all canonical views, and L3 sign-off.

Progress (r45): **translucency**. Blended materials (glTF "BLEND") no
longer draw opaque. Their surfaces shade as opaque ones do (opaque.wgsl
`shadeSurface`, without the screen's ambient occlusion, which is the
surfaces' behind), then go in order over the opaque pass's resolved
targets one of two ways (`View.translucency`, a switch in the viewer):

- "moments" (default): moment-based OIT (Münstermann, Krumpen, Klein and
  Peters 2018), four power moments of absorbance in 32-bit float targets
  (`float32-blendable`; 16-bit otherwise), depth warped logarithmically
  over the blended draws' own range (their bounding spheres from the
  camera: a range reaching kilometers past a model's centimeters left its
  layers indistinguishable). Two passes over the blended geometry, a
  fixed 36 bytes a pixel, single-sampled. Two fixes to the published
  form, both found as black speckles: a lone layer evaluated at its own
  depth makes the reconstruction's quadratic degenerate (its division
  gave NaN about one time in six in 32-bit floats; caught before
  dividing, the overestimation's weight used), and the bias 5·10⁻⁶, not
  5·10⁻⁷ (no failure in 400,000 random stacks of one to four layers).
- "exact": every fragment into a list per pixel (fragment-stage atomics),
  sorted and blended front to back (since the Slang step 4 work, a compute
  pass, `sortLists`, then the composite), the nearest 32 kept.
  Multisampled: each node keeps the samples it covers and is in front of
  the opaque surfaces at, and the sort blends each sample on its own, so
  glass's edges antialias (see the correction below). The lists grow to a
  quarter more than a frame needed (its count read back). The reference
  "moments" is tested against.

Neither has a depth attachment: a storage write disables early depth
tests, so translucent fragments test the opaque depth themselves, per
sample at their own depth there (from its slope; tested at the pixel's
center, glass meeting its frame speckled). One full-screen composite
blends either result over the scene-referred target (premultiplied
"over") and the display-referred one (its color the same, its alpha, the
unlit share, times the light let through), so glass over imagery and over
lit content tonemap sensibly. Blended surfaces' opaque parts (alpha ≥
0.999) draw in the opaque pass, with depth, shadows (glass lets the sun
through) and picks: near-opaque layers centimeters apart are what the
moments tell apart worst. Cutouts (alpha mask, and those opaque parts)
use alpha to coverage in the opaque pass's depth stage, the alpha
sharpened to a pixel-wide ramp across the cutoff, so their edges
antialias like geometry's; shading at equal depth fills just those
samples. Deviation from §3.5: the lists are the reference and an option,
not the default with the moments as overflow fallback; the moments are
the default, cheaper and bounded (below).

Tested against the reference (parity/translucency, `bench/run.mjs
translucency`): six scenes on the bare ellipsoid (stacked and crossing
layers, glass around opaque boxes with one poking through its wall, 16
layers, near-opaque layers 5 cm apart, layers 1 cm apart). Moments within
mean FLIP 0.02 and p95 0.11 of exact everywhere; near-opaque layers are
worst (the front pane takes on the color of those behind). The lists are
order-independent (draws added in reverse: 0, at most 0.0012 where
near-opaque layers tie). Cost on the station design model's glass canopy
filling a 1489 × 1416 view (4× MSAA, RTX 3000 Ada laptop, rendering
continuously): the frame 15.2 ms without the translucent passes, 15.9 ms
with moments, 17.3 ms with exact lists.

Correction (Slang step 4, Apple M-series, Metal): on this GPU the
reference was wrong, not the moments. A 4× multisampled fragment shader's
storage writes run once per sample: each of the four runs sees the
pixel's center and its whole coverage mask, so the lists' pass put every
layer into its list four times, and "exact" blended each layer as
1 − (1 − α)⁴. Glass came out dark and saturated, and the moments, right,
looked gray beside it (mean FLIP 0.03 to 0.12, p95 to 0.69, since r45 at
least). A bare kernel shows it: a fullscreen triangle whose fragment
shader adds one to an atomic counts 4.00 a pixel at 4× and 1.00 at 1×,
whatever else it reads or writes; the shading itself takes no longer.
The RTX record above did not see it. WebGPU doesn't say how many times
a fragment shader runs for a pixel, so the lists no longer depend on it.
Each node carries the samples it covers and is in front of the opaque
surfaces at (the top four bits of its `next` word, leaving 2²⁸ nodes),
and `sortLists` blends each of the four samples on its own and averages
them: coverage per sample instead of as alpha, so edges where layers
cover different samples are right too. Where storage writes run once per
covered sample (a startup probe, gpu/sampleRateProbe.ts: one 4× draw
counting itself), the pass runs per sample explicitly
(`fsListSamples`) and only the run for the first covered sample writes;
every run's mask is the whole pixel's there, so it is one node per layer,
as before. Where a run's mask were its own sample alone, each would write
its own node, still right. Elsewhere it runs once per pixel (`fsList`),
as at r45. On the kernel gate the sort costs 13% more (2.38 ms against
2.1 on its synthetic lists). On this Mac moments are then within mean
FLIP 0.020 and p95 0.11 of exact (near-opaque the worst; crossing 0.002,
the glass box 0.001; exact's antialiased edges against the moments'
aliased ones count).

The page now has a ground truth: two unlit scenes (three layers over a
backdrop, eight crossing), each pixel's sorted "over" computed on the CPU
from each layer's coverage (rendered alone; its samples covered from the
resolved value, so a pixel on one layer's edge has a truth too). Exact
matches it within 0.6 of an 8-bit step, its 1,675 and more edge pixels
included (before the fix: 63.5; single-sampled, 54 at the edges); moments
are 0.3 to 0.4 steps off on average, 5 at worst (off the edges, which
their single-sampled passes don't antialias). Every row passes or fails against limits
(FLIP mean 0.03, p95 0.15; order 0.001; exact 2 steps, moments 4 on
average), so `bench/run.mjs translucency` catches it. Cost (the page's
`runTranslucencyCost`, 1920 × 1080, each frame waited on; the passes'
timestamps are not usable on Apple's GPUs, a render pass's taking in the
ones before it): single-sampled, exact added 1.5 to 7.8 ms to a frame
over the eight scenes, moments 0.3 to 6.2. The antialiased lists cost
more on this Mac, where every covered sample runs the list pass: the
16-layer stack +12 to +15 ms against +1.3 to +6.5 single-sampled (two
runs each), the lone glass box +8 against +4.5 to +6. Shared memory
can't help there (fragment shaders have none); the sort, which uses it,
stays at 3 to 4 ms either way. The runs that write nothing stop shading
at their alpha (opaque.wgsl `surfaceLight`: their lighting doubled the
pass), 1 to 2 ms of it. Letting them return before any shading at all (an
experiment, derivatives off) saved about 1 ms more: what is left is the
runs themselves, how this GPU runs a multisampled pass with storage
writes, not their work. In the gallery example's default scene
(1164 × 1406, lit): moments +1.9 ms, exact +7.3 antialiased against +4.7
single-sampled. Timed one frame at a time on a canvas, a frame quicker
than the display's refresh heard it was done only at the next one (16.7
ms at 60 Hz), so the scene without glass came out slower than with
moments and exact at +22; both cost measurements now render their frames
back to back and wait once. Where the probe finds once a pixel, the pass
costs what it did at r45. Exact stays the reference, antialiased;
moments stay the default; the Windows runs (§3.4 step 4) measure both
again.

Found by the gallery's translucency example (examples/translucency,
moments above and exact below on one camera, sliders for the layers,
their spacing and alphas, and each way's cost): when a frame's lists
overflowed, the engine grew them from its count but drew nothing more
on demand, so glass stayed missing until the camera moved. It now
requests the frame.

Later (the antialiased lists' cost):

- Measure on NVIDIA and on Windows first: there the probe should choose
  `fsList` (once a pixel), and the antialiased lists should cost about
  the single-sampled ones plus the sort's 13%. If they do, the items
  below are only for Apple's GPUs.
- Shade once, cover separately: a single-sampled pass shades each
  fragment and writes its node, and a trivial multisampled pass (no
  shading, only the samples) sets the nodes' sample bits, the two
  matched by draw and `@builtin(primitive_index)` (the optional
  `primitive-index` feature, which the Apple adapter has; without it,
  per sample as now). Should bring Apple near the single-sampled cost.
  The trivial pass's floor, measured with every run returning at once:
  about 2.6 ms in the example's default scene, the sort and composite
  included.
- Or, where the probe finds per-sample runs, single-sampled lists with
  FXAA as an option (`View.fxaa` exists): cheaper, but glass's own
  silhouettes smoothed, not resolved.
- Not to try: shared memory (fragment shaders have none in WebGPU; the
  sort, a compute pass, uses it already and isn't the cost), and
  shading edges per sample and interiors once (WebGPU has no
  variable-rate shading).

**FXAA** (r45, `View.fxaa`, off by default): FXAA 3.11's quality version
(Lottes) after tonemapping, on top of 4× MSAA: the present pass tonemaps
into an encoded 8-bit image and FXAA reads it into the view's rectangle,
overlays after. It smooths what MSAA leaves (within shading, and the
moments' single-sampled edges). A viewer switch for both engines.

**LDR/HDR paths**: settled differently than §3.5 planned. There is one
path, HDR (rgba16float, pre-exposed, tonemapped in the present pass),
with display-referred content (unlit: imagery, photogrammetry) kept in
its own 8-bit sRGB target and added after tonemapping, so photographs
show as authored, as 1.x's LDR default shows them. 1.x's gamma 2.2
output and ACES are view options for comparisons. A separate LDR scene
target isn't needed.

**Exit status (r45).** L2 against 1.x (`bench/run.mjs parity models
imagery globe tileset`, RTX 3000 Ada): 79 of 83 image comparisons within
mean FLIP 0.05 and p95 0.2; the globe's tiles match 1.x's in every view
(Jaccard 1). The four others are intended differences: BoxCutout lit
(mean 0.049 to 0.056, p95 0.38 to 0.48; 0.21 and 0.96 before
translucency), where 1.x's weighted, blended OIT lets the faces behind its
alpha-1 frame show through and 2.0 draws them opaque (translucency is
tested against 2.0's own exact lists, r9); and UnlitTest lit (mean
0.074), where 1.x tonemaps unlit color under HDR and 2.0 shows it as
authored (display-referred, as glTF's unlit and 1.x's LDR default). With
translucency the only failure before, the models table's BoxCutout row
(unlit) is now 0.018. **L3 signed off** by the plan owner (2026-11-03,
"good enough for now"), with the open bug below: M4 is done.

**Open bug: East Antarctica drawn as ocean from far out (r45).** With
Cesium World Terrain and Bing, from about 25,000 km over the South
Atlantic, part of the Antarctic ice sheet beyond the pole shows as
ocean-colored, bounded by straight edges, with a seam through the ice.
A small rotation makes it go away. 1.x at the same camera draws the
whole ice sheet.

- Repro (Dyno viewer, `#/viewer?engine=2.0&asset=96188`, 2026-11-03
  11:00 local, sun from date and time, default settings): camera ECEF
  position (6325610.29, -16639664.12, -18088692.37) m, direction
  (-0.254088, 0.617099, 0.744733), up (-0.092624, -0.78199, 0.61637),
  right (0.962736, 0.087632, 0.255853), vertical fov 60°. Set it with
  `dynoViewer.viewer.view.camera` (`position`, `direction`, `up`,
  `right`, then `version++`). Globe tiles selected: 1/0/0, 1/1/0, 1/0/1,
  1/1/1 and the level-0 eastern hemisphere 0/1/0.
- Fixed (an 8.3° turn): position (4899582.15, -14201053.89,
  -20455237.03) m, direction (-0.196158, 0.517243, 0.833056), up
  (-0.059528, -0.854275, 0.516402). There 0/1/0 refines to 1/2/0 and
  1/3/0.
- 1.x selects the same five tiles at the repro camera, at the same
  distance for 0/1/0 (30,247 km, overestimated: `TileBoundingRegion`'s
  four edge planes coincide for a 180°-wide region, so the plane offset
  counts twice; the tile's nearest point is about 21,300 km away). So
  the selection matches 1.x and isn't the bug; 2.0 draws it wrong.
- Ruled out: 0/1/0's imagery slice (read back on the GPU: ice where it
  belongs) and its mesh and texture coordinates at the blue pixels;
  frustum culling (every sphere inside), mixed-LOD clip and placeholder
  state (none set); sun shadows, ambient occlusion, aerial perspective
  and sunlight through the atmosphere (each toggled off: still broken);
  back-face normal flipping (disabled for globe tiles: still broken).
- Seen: drawn unlit (`World.setImagery(…, unlit)` on 0/1/0's record),
  the missing area shows the tile's ice, so the tile is drawn there
  with the right imagery and its lit color is wrong. Picks in the area
  land 40 to 85 km below the ellipsoid: the level-0 tile's 400
  triangles sag (chords up to about 20° across), and the level-1
  neighbors' skirts reach 193 km below their edges (0/1/0's: 385 km).
  Next: what in the lit path uses the fragment's position or depth
  (the sagged chord is far below the ground), beginning with the IBL
  and specular terms and the deferred aerial-perspective volume.

### Custom shading (PoC, after M4)

- §3.4 foundations 1-6: shader identity in batches with an async pipeline
  cache, attribute directory, material parameter blocks, pass variants,
  the `cesium` Slang module, runtime compilation in a worker.
- Public API: a custom material and vertex modifier per model or tileset,
  and feature styling (`IFeatureStyle`) as the target 3D Tiles styling
  compiles to.
- Port representative 1.x `CustomShader` Sandcastles (attribute-driven
  color, feature styling, vertex displacement, unlit and PBR outputs) and
  compare against 1.x (L2).
- _Exit_: a user Slang material and vertex modifier on a model and on a
  tileset, compiled at build time and at runtime, in every pass; no frame
  stalls when a new shader arrives; batching cost per extra material type
  measured.

**Increment 1 (r46): the WGSL contract, shader identity and pass variants
(foundations 1, 4 and part of 5).**

- `CustomShader({ vertex, fragment, displacement })`: WGSL stages named as
  1.x's. `vertexMain(vsInput, vsOutput)` moves the vertex in model
  coordinates (position, normal); `fragmentMain(fsInput, material)`
  changes the glTF material's values after sampling and before lighting
  (base color, alpha, metallic, roughness, shading normal, occlusion,
  emissive, unlit). Inputs: model, camera-relative and Earth-fixed
  positions, normal, first UV and color, feature ID, vertex and instance
  index, screen pixel, `time` (new `View.time`, seconds since the engine
  started). The contract's structs live in opaque.wgsl; the engine's own
  module is the same code with no-op stages.
- On `ModelOptions.shader`, `Tileset3DOptions.customShader` and
  `DrawOptions.shader`. The batch key gains the shader; a displacement
  bound pads the draws' culling spheres.
- Pipelines: the 19 that draw content (opaque, lines, depth, shadow and
  prepass, masked and double-sided variants, translucent lists and
  moments) are one `SurfacePipelines` set built from one module, the
  engine's or a shader's. `ShaderCache` compiles a shader's set in the
  background once per distinct source; batches draw with the engine's
  until it is ready, then the world records again (no stall), and keep it
  if compiling fails. Errors are logged once, at the stage's own line
  (`fragment line 2: …`). `Engine.compileShader` warms a shader ahead.
- Harness `parity/customShader` (`bench/run.mjs customShader`), boxes on a
  ground plane with shadows and AO: identity stages and a failing shader
  match the default exactly (FLIP 0); color by height, a vertex twist
  (no depth-prepass holes; its shadows move with it), unlit and a
  translucent tint differ. Parity, models and translucency are unchanged
  (318 image metrics, none moved).
- Not yet: Slang authoring on this contract and runtime Slang (foundation
  6); named attributes (glTF parsing keeps only the core six; foundation
  2); parameter blocks and user textures (3); feature styling (needs
  properties on the GPU); changing a tileset's shader after load; a custom
  alpha doesn't reach the depth pass's alpha-to-coverage cutout (done in
  r47, Real-time tracks increment 1).

**Increment 2 (r46): Slang stages, at build time and at runtime
(foundations 5 and 6).**

- The `cesium` Slang module (shaders/cesium.slang, version 1) mirrors the
  contract's four structs; a shader `import cesium;` and defines
  `vertexMain`, `fragmentMain` or both, as in WGSL. The engine's shaders
  stay WGSL: only the user's stages go through Slang. Slang emits
  functions only from an entry point, so a generated stub fragment entry
  point calls the stages; Slang keeps them as functions (`vertexMain_0`)
  with renamed copies of the structs, fields in declaration order, and
  slangStages.ts appends the contract's functions, converting by
  position (the stub's entry point stays, unused).
- Build time (recommended): `npm run slang -- stages.slang` (SLANGC,
  scripts/slangShader.mjs) writes WGSL for `CustomShader({ wgsl })`.
  Runtime: `CustomShader.fromSlang(source)` compiles in one worker that
  loads the Slang WebAssembly build on first use (`slangUrl`). Errors
  come back with Slang's lines in the user's source.
- The harness's twist and color-by-height in Slang, both ways, draw
  exactly what the WGSL draws (FLIP 0, shadows and AO on); runtime is
  skipped where slang-wasm isn't served. Runtime cost: 0.5 s cold (worker
  and WebAssembly), 52 ms warm; the main thread's longest gap meanwhile
  19 ms.
- Remaining for the exit: a Slang shader on a tileset (the option exists;
  not yet shown with real content), frame times while a new shader's 19
  pipelines compile, and the batching cost per extra material type.

**Increment 3 (r46): pipelines on demand; the costs.**

- Microbenchmark `bench/shaderCost` (`bench/run.mjs shaderCost`). Arrival:
  1,024 boxes drawn every frame on a canvas while a shader the engine
  hasn't seen arrives on one more box. Compiling all 19 of its pipelines
  at once held frames up: worst 108, 47 and 67 ms for fragment-only,
  vertex-only and both, 1–2 frames over 34 ms and long animation frames
  each, though the main thread's WebGPU calls took 0.4 ms in all (the
  GPU process's compiling, ≈680 ms, competed with the frames' drawing).
- So a custom shader now compiles once (its module checked, errors
  reported) and each pipeline (`SurfaceKey`) is made in the background
  when a batch first asks for it; that pass uses the engine's pipeline
  until then. Opaque, one-sided triangles make 4 (opaque, depth, shadow,
  prepass) of the 19; translucent pipelines and their module only for
  blended content. `Engine.compileShader` still makes all 19 (warming
  ahead). Arrival then: 0 frames over 34 ms, worst 16.8–17.2 ms, the same
  as with no change; an unlit red shader shows from 400 ms after its box
  appears, drawn with the engine's shader before.
- Batching: 4,096 boxes at 1920×1080 spread over 1 to 64 shaders (each a
  batch and a pipeline switch): GPU 1.05–1.17 ms and CPU 0.11–0.27 ms per
  frame throughout, against 1.09 and 0.27 ms with the engine's own; at most
  ≈1 µs of GPU per extra shader, none measurable on the CPU.
- On a tileset: the harness streams `Batched/BatchedColors` (b3dm, tile
  content through `addModel`) with `customShader` height bands in WGSL
  (FLIP 0.013 against the default) and the same bands in Slang, compiled
  at build time and at runtime: both match the WGSL exactly. 12 of 12
  cases pass.

**Exit status (r46).** Met: a user Slang material and vertex modifier on
models and on a tileset, compiled at build time and at runtime, drawn in
every pass (opaque, depth, shadow, ambient-occlusion prepass,
translucent); no frame stalls when a new shader arrives; batching cost
per extra shader measured (≈1 µs GPU). Still open from this milestone's
list: named vertex attributes (foundation 2), typed parameters and user
textures (3), feature styling with properties on the GPU
(`IFeatureStyle`), and ports of 1.x `CustomShader` Sandcastles compared
with 1.x (L2), which need 2 and 3.

**Increment 4 (r47): named attributes and metadata property attributes
(foundation 2).**

- Decisions. glTF requires application attributes to start with `_`;
  1.x then renames them for shaders (`_TEMPERATURE` →
  `attributes.temperature`, stripped and lowercased), which is lossy
  (`_Temp` and `_TEMP` collide), hides which attribute a name reads, and
  types each shader per model. 2.0 instead has the shader declare what it
  reads: `attributes: { temperature: { semantic: "_TEMPERATURE", type:
"f32" } }`, a name of its choosing bound to the exact semantic. One
  shader, one compile, whatever the model. For data with meaning
  (temperatures, classifications) the primary path is metadata, not raw
  attributes: `EXT_structural_metadata` gives an attribute a schema
  (type, normalization, offset and scale), shared with 3D Tiles property
  tables and textures, and 1.x already exposes it as
  `fsInput.metadata.<property>`. Raw attributes are the layer under it.
- glTF parsing keeps every attribute the engine doesn't read itself
  (`TEXCOORD_1`, `COLOR_1`, `_TEMPERATURE`, …; not skinning or feature
  IDs) by semantic, and each property attribute by property ID with its
  offset and scale applied (the property attribute's own, else its
  class's; normalized integers come from the accessor already in [0, 1]).
  Both are unwelded with flat-shaded meshes. `MeshData.attributes` and
  `.metadata` take the same from code.
- The world uploads them as streams plus a per-mesh directory in the
  arena (count, then name hash, stream offset and components per entry,
  metadata under `metadata.<id>`); the draw record gains its offset
  (`DrawRecord.attributes`, the record 128 → 144 bytes). Nothing is read
  unless a shader declares it.
- `CustomShader({ attributes, metadata })`: types `f32`, `vec2f`,
  `vec3f`, `vec4f`, `mat2x2f` (glTF MAT2, column-major). The engine
  generates per shader the `Attributes` and `Metadata` structs in
  `VertexInput` and `FragmentInput`, a reader per value (`readNamed`: the
  directory searched by hash; zero where a mesh hasn't it) and a varying
  per value (locations 10–13, so at most 4 per shader), interpolated for
  the fragment stage. The pipeline cache keys on the generated code with
  the stages.
- Slang: the `cesium` module (version 2) is generated per shader with
  the same two structs (`fromSlang` takes the declarations; the CLI
  `--attributes name:type,…` and `--metadata`), and the adapter converts
  them by name. Matrices are transposed on the way in: Slang's are
  row-major in meaning, so `mul(m, v)` there is glTF's M v, as `m * v` is
  in WGSL.
- Harness, 9 new cases (21 of 21 pass): an asymmetric shear (MAT2) and
  heat on the boxes, in both stages, in WGSL and in Slang built both ways
  (identical: the transpose is right); a declared attribute and property
  a mesh hasn't read zero (identical to the default); 1.x's
  `BoxTexturedWithPropertyAttributes`: `temperatures` (normalized UINT16,
  offset/scale to °C) and `transformedWarpMatrix` (MAT2, offset/scaled)
  match the raw attribute transformed by hand exactly, and the vertex
  stage lifts by temperature. Parity, models and translucency are
  unchanged (318 image metrics, none moved).
- Not yet: integer attributes and metadata (all floats; flat
  interpolation for IDs), `noData` and `default`, metadata enums and
  strings, more than 4 values per shader (packing varyings would allow
  16 components), property textures (with user textures, foundation 3)
  and property tables on the GPU (with feature styling), and a 1.x
  comparison (L2) of the property-attribute Sandcastle.

**Increment 5 (r47): typed uniforms and user textures (foundation 3,
first part).**

- `CustomShader({ uniforms })`, as 1.x's: values (`f32`, `i32`, `u32`,
  `vec2f`, `vec3f`, `vec4f`, `mat3x3f`, `mat4x4f`; matrices column-major)
  read as `uniforms.<name>`, and textures (`type: "texture2d"`, a URL,
  `ImageBitmap`, `ImageData` or canvas; read as stored, rgba8unorm with
  mipmaps; repeat or clamp, linear or nearest) sampled as
  `textureSample(<name>, <name>Sampler, uv)`, in either stage. At most 4
  textures. `setUniform(name, value)` changes either; content redraws on
  demand.
- Binding. All four bind groups are in use, and a batch has one shader,
  so they extend group 2, the batch's texture set: the values at binding
  10, textures and samplers from 11 (8 of the device's 16 samplers were
  in use). A shader with uniforms has its own group-2 layout, per
  distinct code (`Pipelines.setLayout`); worlds make a group per texture
  set and shader, and bind it only with the shader's own pipelines (the
  engine's stand-in keeps the plain set). `ShaderBindings` keeps each
  shader's uniform buffer and textures on the device, written before
  frames (`flush`); a texture reads white until it has loaded, then the
  worlds record again. One buffer per shader object: shaders with the
  same code and different values share pipelines.
- The buffer follows WGSL's uniform layout, which for these types is
  std140's too, so Slang's `ConstantBuffer` matches it. Slang: the
  `cesium` module declares the same bindings (`[[vk::binding]]`,
  `--uniforms name:type,…` for the CLI); matrices are declared
  `row_major` and written transposed, so `mul(m, v)` there is M v. The
  pin matters: slangc 2026.20 stores uniform matrices column-major by
  default and the slang-wasm build row-major, so the same source drew
  differently until it was declared.
- Harness, 6 new cases (27 of 27 pass): every value type, including an
  asymmetric `mat3x3f` and a negative `i32`, matches the same values as
  constants exactly, from WGSL and from Slang both ways; `setUniform`
  after creation matches the constants with the new value; a texture by
  URL, sampled in the vertex stage (lifting) and the fragment stage,
  differs from a white one (it loaded). The harness now compiles the
  shader each case is compared with too (it had drawn with the engine's
  while compiling), and tells a missing slang-wasm from a served one by
  its content type (Vite answers missing paths with its HTML page, 200,
  so runtime cases ran and failed on a bench server without
  `SLANG_WASM_DIR` instead of being skipped); with it set, the bench
  passes 27 of 27. Parity, models and translucency are unchanged (318
  image metrics, none moved).
- Not yet: arrays and booleans, matrices other than 3×3 and 4×4, cube
  and array textures, textures in sRGB, sharing a texture between
  shaders, freeing a shader's buffers before the engine's end.

**Increment 6 (r47): metadata property textures.**

- `EXT_structural_metadata` property textures read the same as property
  attributes: a shader declares `metadata: { insulation: "f32" }` and
  reads `fsInput.metadata.insulation`, whichever way the mesh stores it.
  As in 1.x, only the fragment stage reads them; the vertex stage reads
  zero.
- Parsing records per property its texture, channels, component type
  (8-, 16- and 32-bit integers, FLOAT32), components, normalization and
  offset/scale; arrays, texture coordinates other than TEXCOORD_0 and
  `KHR_texture_transform` are warned about and skipped. Images were
  already decoded without color conversion or premultiplication.
- Up to 2 property textures per mesh join the texture set (group 2,
  bindings 20 and 21, `TextureSetOptions.properties`); a model makes a
  texture set per material and mesh where a mesh has them. The mesh's
  directory marks such a property (`TEXTURE_PROPERTY`) and points at a
  block describing its decoding; the vertex arena becomes readable by
  fragments for it. `readTextureProperty` fetches the texel at
  TEXCOORD_0 (repeating, nearest, `textureLoad`: the bytes exactly),
  assembles each component little-endian from the listed channels,
  converts, normalizes and applies offset and scale.
- Harness, 7 new cases (34 of 34 pass) on 1.x's test models: UINT8 and
  normalized UINT8 (`SimplePropertyTexture`), FLOAT32 over four channels
  (`PropertyTextureWith32BitTypes`) and normalized VEC2 with and without
  offset/scale (`PropertyTextureWithVectorProperties`) each match the
  same image bound as a user texture and decoded by hand in WGSL
  exactly; the vertex stage reads zero. Model cases are now framed by
  the model's bounds. Parity, models and translucency are unchanged
  (318 image metrics, none moved); the bench, with `SLANG_WASM_DIR`,
  passes 34 of 34.
- Not yet: arrays, `noData`/`default`, enums, other texture
  coordinates, texture transforms, more than 2 property textures per
  mesh, and property tables on the GPU (feature styling).

**Increment 7 (r47): feature tables on the GPU.**

- A mesh's feature table (`MeshData.featureTable`: an
  `EXT_structural_metadata` property table or a b3dm/i3dm batch table, as
  picking uses) reaches custom shaders as metadata too:
  `fsInput.metadata.Height` is the fragment's feature's value, in either
  stage, the same declaration whether the mesh stores the property per
  vertex, in a texture or per feature. Numbers, booleans (0/1) and
  numeric arrays of up to 4 are uploaded as float32 rows by local feature
  ID, once per table object and shared by its meshes (freed with the
  last); strings aren't; missing values read 0. Models pass each mesh's
  table (an i3dm's for its instances).
- The directory marks a column (`TABLE_PROPERTY`); the vertex stage
  reads the vertex's feature's row (an instance's feature for instanced
  draws; feature 0 for a draw without per-vertex IDs), and the fragment
  stage reads its own feature's row exactly
  (`readFragmentProperty`), not an interpolation.
- Harness, 3 new cases (37 of 37 pass): a box with each face a feature
  and a table (a scalar and a vec3 column, beside a string column that
  isn't uploaded) matches the same values as per-vertex attributes
  exactly, lifting faces in the vertex stage and tinting them in the
  fragment stage; the streamed `BatchedColors` tileset colored by its
  batch table's `Height`. Parity, models and translucency are unchanged
  (318 image metrics, none moved); the bench passes 37 of 37.
- Next for feature styling: a style API (show, color per feature) as the
  target 3D Tiles styling expressions compile to, on these columns; a
  way to hide features in every pass (depth, shadows) that a fragment
  stage's alpha doesn't reach; string and enum properties (an index per
  distinct value).

**Increment 8 (r47): 3D Tiles styles (feature styling).**

- `FeatureStyle({ show, color, defines, colorBlendMode })`: 1.x's style
  JSON, expressions and `conditions`, compiled to WGSL
  (styleExpression.ts) over the features' metadata, whichever way a mesh
  stores it, as a custom shader (`style.shader`, or
  `Tileset3DOptions.style`). Semantics as 1.x's `Expression`: JavaScript
  precedence, `rgb` in bytes, `rgba`/`color` alpha 0–1, `hsl` hue 0–1,
  CSS names and hex in `color()`, component-wise math (`round` halves
  up, as `Math.round`), vectors and `.x`/`.r` members, strict equality
  false across types, `${feature['name']}` for names that aren't
  identifiers. Types are checked at compile time; strings (other than
  `color()`'s), regular expressions and `undefined` are refused by name,
  since the GPU has no string properties.
- `show` false, or a color with alpha 0, hides a feature in the vertex
  stage: its vertices collapse to a point, so its triangles have no area
  in any pass (depth prepass, shadows, picking). A fragment discard
  would have left its depth in the prepass, a hole. `color` applies in
  the fragment stage ("highlight" multiplies, "replace", "mix" by
  amount); its alpha scales the material's.
- Custom shaders' `metadata` may name a field apart from its property
  (`{ property: "building:levels", type }`), as styles need.
- Unit tests (7) for precedence, property forms, 1.x's color
  conventions, vector typing and refusals; harness, 4 new cases (41 of
  41 pass): on `BatchedColors`, a show and a color style with conditions,
  a define, `color()`, `rgb()` and `hsl()` match the same written by hand
  in WGSL exactly; hidden faces of the feature box cast no shadows.
  Parity, models and translucency are unchanged (318 image metrics, none
  moved); the bench passes 41 of 41.
- Not yet: changing a tileset's style or shader after load (the batch
  key holds the shader; draws would move between batches), translucency
  from a style's alpha (1.x moves such features to the translucent pass),
  string properties (an index per distinct value would allow `===` on
  them), `pointSize` and the point-cloud style fields, regular
  expressions, more than 4 properties per style, and a 1.x comparison
  (L2) of styled tilesets.

**Increment 9 (r47): per-instance values (ahead of real-time tracks).**

- An instanced draw's streams (`InstanceOptions.streams`: `stride` words
  per instance, interleaved) name their fields (`layout: { heading: {
offset: 0, components: 1 }, … }`); the world stores a per-draw
  directory beside the data (`DrawRecord.instanceDirectory`, the
  record's spare word). A shader declares `instance: { heading: "f32",
symbol: "u32" }` (the named types and `u32`, `i32`) and reads
  `vsInput.instance.<name>`, `fsInput.instance.<name>`: exact in both
  stages, integers too (the fragment stage reads the arena by the
  instance's index, carried in one flat varying, location 14);
  `FragmentInput.instanceIndex` is new. Zero where a draw hasn't them.
- `World.setInstanceStreams(draw, firstInstance, data)` rewrites whole
  instances from one in a single copy: the bulk update tracks need (a
  feed's tracks as one typed array, no per-track call).
- The struct is `InstanceValues` (the engine's `Instance` is the
  instance table's). Slang: the same struct in the `cesium` module,
  `--instance name:type,…` for the CLI.
- Harness, 5 new cases (46 of 46 pass): three boxes as one instanced
  draw with lift, tint and an integer symbol per instance match the same
  constants indexed by `instanceIndex` exactly, in both stages; after
  `setInstanceStreams` rewrites one instance, the constants with it
  changed; Slang built both ways matches the WGSL. Parity, models and
  translucency are unchanged (318 image metrics, none moved); the bench
  passes 46 of 46.

### Real-time tracks (after Custom shading)

- §13.11: track collections as instance data with a bulk update API,
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
  texels: the 128 on roofs within half a millimetre. The 100,000-track
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

- _Dyno's Examples_ (§13.12): a rail entry and `/#/examples/<id>`. An
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
  roofs within half a millimetre); a 100,000-point feed update is 1.0 ms
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

### M5 — Performance hardening (≈3 wks)

- Two-phase occlusion culling (optional if targets are already met).
- HZB tile-coverage feedback into `Budgeted`.
- Upload budgeting; the remaining `Budgeted` stability and prediction work.
- Benchmark suite v2 (§16.8, §16.9): nightly runs on dedicated machines,
  a results store, change points, alerts and triage, automatic
  bisection, pull-request comments, scene pages, "what differs" analysis,
  traces from the report.
- _Exit_: §5 targets met or the gap explained, including multi-view.

### M6 — Compute showcases and future-proofing (time-boxed, pick 2–3)

- Gaussian splats with GPU sort.
- Two-pass compute point clouds.
- GPU styling; CAD edges.
- Engine-in-worker.
- WebXR.
- Headless rendering via Dawn.

---

## 7. Risks

### 7.1 Bindless textures: not in the PoC, designed for in 2.0

- **Status (late 2026)**:
  - `sized-binding-arrays` and `bindless` resource tables (`GPUResourceTable`, `getResource<T>(i)`) are **draft proposals**.
  - Chrome has shipped only groundwork and lists bindless as "under consideration".
  - Firefox and Safari have nothing.
- **For our data, bindless isn't needed yet**:
  - Photogrammetry/P3DT tiles carry 1–2 textures, so one bind group per tile baked into its bundle is effectively free.
  - Untextured CAD uses the material table.
  - Imagery uses a texture array.
- **What we do now**: every texture access goes through a `TextureHandle` and a single shader interface boundary. A resource-table backend can then drop in when `sampling-resource-table` ships, with no caller changes.
- **The material seam, built (r50, §13.15)**: setting the stage for bindless.
  - Material records carry their texture references (six 16-bit refs in the record's last three words, `MaterialData.textures`).
  - `World.textureRefs` makes them: today a reference is the slot in the batch's texture set.
  - Shaders read material textures only through opaque.wgsl `materialTexture(material, slot, uv)` and `materialHasTexture` (common.wgsl). `test/bindless.test.ts` fails on any other read of the group-2 material textures.
  - For bindless, three things change: `materialTexture` (to `textureSample(table[ref], …)`), `World.textureRefs` (to return table indices) and group 2 (one group for the world). Callers, the record's layout, material sharing and custom shaders don't.
- **Reassess at 2.0 GA.** If bindless is broadly available by then, the visibility buffer becomes a 2.x option.

### 7.2 Platform and WebGPU risks

| Risk                                                                            | Mitigation                                                                           |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Hi/lo precision broken by compiler reassociation or fusion (Metal relaxed math) | Single compute draw-prep site; integer-assisted subtraction if needed; M0 Metal test |
| Silent no-op indirect draws without `indirect-first-instance`                   | Instance-step attribute fallback always compiled in                                  |
| Integer MRT can't be MSAA-resolved                                              | Sample-0 custom resolve in the pick pass                                             |
| Dawn indirect-draw validation overhead                                          | Measure in M0; keep args in bounds provably where possible                           |
| No VRAM budget API; OOM = device loss                                           | Heuristic budgets, adaptive after loss, robust device-loss replay                    |
| Single queue, no async compute; uploads stall rendering                         | Per-frame upload byte/ms budget; encode compute early                                |
| `mapAsync` latency of 1–3 frames                                                | Async pick/query APIs by design                                                      |
| Subgroups ≈0% on Safari/Firefox                                                 | Portable kernel paths (wait-free radix sort, workgroup reductions)                   |
| Render bundles invalidated by pipeline or bind-group changes                    | Rebuild per tile on change; limit target configurations                              |
| Slang WGSL backend gaps                                                         | Hand-written WGSL kernels allowed; WGSL-level ABI; WESL fallback                     |
| Browser coverage                                                                | Chromium first; parity suite on Safari and Firefox where available                   |
| Compatibility mode not supported                                                | Stated non-goal                                                                      |
| Fragment storage writes run once per sample under MSAA (Apple, Metal)           | Lists' nodes carry their samples; per-sample pass where probed; parity ground truth  |

### 7.3 Project risks

- **Schedule**: 5–6 months across everything here is optimistic. Droppable in this order:
  1. M6
  2. two-phase occlusion culling
  3. MBOIT (keep the exact linked-list mode, at its higher cost)
  4. `Budgeted` prediction and GPU feedback
  5. pixel-exact horizon-culling parity
- **Globe scope**: defaults plus terrain and imagery only.
- **Parity rabbit holes**: thresholds plus L3 sign-off.
- **Draw-record format churn**: designed in M1 with the globe's needs, so M2 and M3 don't break it.

## 8. Decisions

Recommendations already adopted from the review: core-only (no compatibility mode); camera-relative offsets computed in compute; `instance_index` plus fallback; texture-array imagery cache; sample-0 feature-ID resolve; two-phase occlusion culling or none; limited render-target configurations; 32-bit two-pass point rasterization; bindless designed for but not built.

**Decided by the plan owner (r4):**

| Decision        | Choice                                                                                                                                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Shaders         | Slang for materials and vertex/fragment code; hand-written WGSL allowed for compute kernels; user contract is a WGSL-level ABI. Gated by the M0 spike, with WGSL + WESL as the fallback.               |
| Default look    | **HDR + tonemapping by default** for lit color, LDR as a per-view option; unlit color is display-referred and never tonemapped (r26). Parity baseline is 1.x with HDR on for lit color, off for unlit. |
| Multi-view      | All four scenarios in the PoC: split views on one canvas, multiple canvases, offscreen targets, linked views (`ViewLink`).                                                                             |
| CAD data        | Team-chosen CAD/BIM assets in Cesium ion; iModels can be tiled into ion.                                                                                                                               |
| Foundation      | `packages/next` in this monorepo; TypeScript strict; new typed-array math module tested against 1.x.                                                                                                   |
| Platforms       | Chromium is the gate; Safari and Firefox best-effort; core WebGPU only.                                                                                                                                |
| Milestone order | 3D Tiles (M2) before globe (M3). The draw-record format is locked in M1 with the globe's needs included.                                                                                               |

**Still open:** none blocking M0. Exact OIT, auto-exposure and the M6 picks are decided at those milestones.

### Product choices: where 2.0 departs from 1.x

When 1.x behaves a certain way, 2.0 asks whether to mirror it or do what
is consistent with the rest of 2.0's design. The rule: mirror 1.x where its
behavior is what users want; where it works around 1.x's architecture or
trades correctness for convenience, do what 2.0's design implies, keep a
setting for the 1.x behavior when users depend on it, and record the
choice here so it can be revisited.

| Choice (revision)       | 1.x                                                                                                                                                                                                                                                                                             | 2.0                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Revisit if                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Globe depth (r37)       | `Globe.depthTestAgainstTerrain` off by default: Scene clears depth after the globe, so all content draws over it, including content behind mountains (see-through); apps that want occlusion turn it on.                                                                                        | Real terrain occludes like any other surface. The bare ellipsoid, a stand-in for ground, never hides content: its depth is scaled behind everything (`RecordFlags.underlay`), so data below it (coasts below the ellipsoid, e.g. Aerometrex San Francisco, 30 m down) draws over it. One pass, no depth clear; picking undoes the scale.                                                                                                                                                                              | Photogrammetry or BIM a little below terrain is common in practice (then: hide terrain under a tileset's footprint, or a setting). |
| Clamped content (r37)   | `HeightReference` clamps to whatever terrain has loaded, the coarsest level first (kilometers off), and moves the content on every refinement; `readyEvent` means loaded, not placed, so anything framing or measuring it races the terrain (apps call `sampleTerrainMostDetailed` themselves). | A clamp settles first: the most detailed ground under its anchor is sampled (`sampleHeightMostDetailed`, loading those tiles; surfaces known exactly, the ellipsoid, answer at once) and applied once; until then the content stays where it was placed. `Clamp.settled`, `whenSettled()`, `ModelInstance.bounds()`; `Viewer.zoomTo` frames a model where it stands and once more when it settles, unless the camera moved (`GlobeController.inputs`). After settling it tracks the surface as before.                | Many clamped anchors make per-anchor sampling costly (real-time tracks clamp on the GPU, §13.11).                                  |
| Loading in motion (r37) | `cullRequestsWhileMoving`: no request for a tile the camera crosses in under 60 frames' travel, so content swept past while moving stays coarse or missing until the camera stops (NYC: 5 tiles loaded during an orbit).                                                                        | Prefetch loads what the camera will reveal 1 s ahead at its velocity, at half the detail, after everything visible; content stays sharp in motion at more bytes (NYC ×2.6 of 1.x, 145 tiles drawn in motion that 1.x never loads). r38: a tile is requested in motion only if it stays on screen longer than a typical load (`motionBenefit`), prefetch only while the camera moves (none around a still view), and after everything visible; quality in motion NYC 0.008 vs 1.x 0.030, flight bytes 25.9 vs 24.7 MB. | Bytes matter more than motion quality for a deployment (metered links): a byte budget for motion, or 1.x's rule as a setting.      |

## 9. Sources (from the r3 review)

- WebGPU 146 (compatibility mode, transient attachments): https://developer.chrome.com/blog/new-in-webgpu-146
- WebGPU 149–150 (immediates): https://developer.chrome.com/blog/new-in-webgpu-149-150
- Compat-mode storage-in-vertex limit (Dawn): https://dawn.googlesource.com/dawn/+/ac380332c8cdc29cb15c21034ccd5577e149a0e3%5E%21
- Developer features (timestamp quantization): https://developer.chrome.com/docs/web-platform/webgpu/developer-features
- Subgroups availability: https://web3dsurvey.com/webgpu/features/subgroups
- indirect-first-instance availability: https://web3dsurvey.com/webgpu/features/indirect-first-instance
- Render bundles / executeBundles: https://developer.mozilla.org/en-US/docs/Web/API/GPURenderBundleEncoder
- Bindless proposal: https://github.com/gpuweb/gpuweb/blob/main/proposals/bindless.md
- Sized binding arrays: https://github.com/gpuweb/gpuweb/blob/main/proposals/sized-binding-arrays.md
- What's next for WebGPU: https://developer.chrome.com/blog/next-for-webgpu
- View instancing proposal: https://github.com/gpuweb/gpuweb/blob/main/proposals/view-instancing.md
- WebXR/WebGPU binding: https://immersive-web.github.io/WebXR-WebGPU-Binding/
- 64-bit atomics proposal: https://github.com/gpuweb/gpuweb/blob/main/proposals/atomic-64-min-max.md
- Slang WGSL target notes: https://github.com/shader-slang/slang/blob/master/docs/user-guide/a2-03-wgsl-target-specific.md
- Dawn relaxed math on macOS: https://dawn.googlesource.com/dawn/+/58c1c685a8dab745a8c22d231b7b1cd68bfc977a%5E%21
- luma.gl fp64 on WebGPU: https://luma.gl/next/docs/api-reference/shadertools/shader-modules/fp64-arithmetic
- Depth precision: https://developer.nvidia.com/content/depth-precision-visualized
- Unreal Large World Coordinates: https://dev.epicgames.com/documentation/en-us/unreal-engine/large-world-coordinates-in-unreal-engine-5
- Frostbite FrameGraph (GDC 2017): https://www.gdcvault.com/play/1024612/FrameGraph-Extensible-Rendering-Architecture-in
- Two-phase occlusion (Aaltonen & Haar 2015): https://advances.realtimerendering.com/s2015/aaltonenhaar_siggraph2015_combined_final_footer_220dpi.pdf
- Bevy 0.16 GPU-driven rendering: https://bevy.org/news/bevy-0-16/
- Nanite (Karis 2021): https://advances.realtimerendering.com/s2021/Karis_Nanite_SIGGRAPH_Advances_2021_final.pdf
- Visibility buffer (Burns & Hunt 2013): https://jcgt.org/published/0002/02/04/
- WBOIT (McGuire & Bavoil 2013): https://jcgt.org/published/0002/02/09/
- Moment-based OIT (Münstermann et al. 2018): https://momentsingraphics.de/I3D2018.html
- WebSplatter GPU sort (2026): https://arxiv.org/html/2602.03207
- wgpu_sort: https://github.com/KeKsBoTer/wgpu_sort
- Compute point rasterization (Schütz et al.): https://arxiv.org/abs/2104.07526, https://arxiv.org/abs/2204.01287
- Babylon.js snapshot rendering: https://doc.babylonjs.com/setup/support/webGPU/webGPUOptimization/webGPUSnapshotRendering
- Funkhouser & Séquin 1993: https://dl.acm.org/doi/10.1145/166117.166149
- Skipping levels of detail (Cesium): https://cesium.com/blog/2017/05/05/skipping-levels-of-detail/

## 10. M0 spike results

Two GPUs in the same Windows laptop, both D3D12 via Chromium: a low-end Intel
Xe-LPG iGPU and an NVIDIA Lovelace (RTX 40-series) laptop GPU. CPU and
wall-clock numbers in the NVIDIA runs were taken while other processes were
running unit tests and are noisy; GPU timestamps are quantized to 100 µs by
Chrome without its developer flag. Metal is deferred until a Mac is
available; M0 and M1 target Windows.

| Spike                                                        | Intel Xe-LPG                                                                                           | NVIDIA Lovelace                                                                     | Status                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| L0 math parity                                               | ≤1e-12 relative vs 1.x core (CPU, GPU-independent)                                                     | same                                                                                | pass                                         |
| L2 image parity (`parity/`)                                  | Mean ΔE 0.05–0.91 (1.x gamma 2.2), 0.08–1.72 (exact sRGB); only AA edges differ; ≤1.6% pixels > JND    | Mean ΔE 0.05–0.91 / 0.08–1.72; ≤1.7% pixels > JND                                   | pass; FLIP below                             |
| Color pipeline drift                                         | Exact sRGB vs 1.x `pow(c, 2.2)`: +0.6–0.8 mean ΔE. Views expose `outputEncoding`                       | same                                                                                | measured                                     |
| Hi/lo precision (`spikes/precision.html`)                    | Max error ≈4e-8 × distance (0.04 µm at 1 m, 31 µm at 1 km, ≈4 mm at 100 km); naive float32 0.25–0.47 m | Bit-identical to Intel                                                              | pass on D3D12                                |
| Engine in a worker (`spikes/worker.html`)                    | Runs unchanged on an `OffscreenCanvas`; keeps rendering while the main thread is blocked               | not rerun                                                                           | pass                                         |
| Demo frame (657 draws × 3 views)                             | GPU 2.25 ms, CPU 0.7 ms                                                                                | GPU 0.38 ms, CPU 0.7 ms                                                             | —                                            |
| Indirect vs direct draws, 20k draws (`spikes/indirect.html`) | GPU in-pass 8.67 vs 4.37 ms; wall-clock gap 3–9 ms                                                     | GPU in-pass 0.75 vs 0.15 ms (≈30 ns/draw); GPU span ≈ in-pass; wall-clock gap ≈4 ms | **concern** (cost is per indirect call)      |
| CPU per frame with render bundles                            | 0.6–0.9 ms flat from 1k to 20k draws                                                                   | 0.3–0.4 ms flat                                                                     | pass                                         |
| MSAA feature IDs                                             | `r32uint` cannot be multisampled; `rg16uint` (lo16, hi16) with sample-0 pick reads                     | same                                                                                | resolved                                     |
| Slang (`spikes/slang.html`)                                  | —                                                                                                      | See below                                                                           | **pass**, perf gate needs unquantized timing |

**Indirect draws.** On NVIDIA the GPU-side cost of an indirect call is small
(≈30 ns), and the GPU span from first to last pass matches the per-pass sum,
so whatever Dawn adds happens off the GPU timeline (the ≈4 ms wall-clock gap at
20k draws). On the Intel iGPU the GPU cost itself doubles. Either way the cost
scales with the number of indirect calls, so M1 reduces them: one indirect draw
per batch of records sharing a mesh and material (GPU-compacted instance
lists), CPU tile-level culling before the bundle, and direct draws where the GPU
culls nothing.

**Slang (v2026.20, NVIDIA).**

- Ported the opaque shader and the prep kernel. The material is an
  `IMaterial` interface bound at link time: the engine module declares
  `extern struct Material : IMaterial`, and a separate module exports the
  implementation (`DefaultMaterial`, or a user `ToonMaterial`). With slangc the
  material module is precompiled to a `.slang-module` and linked; at runtime the
  WASM API composes the modules directly.
- slangc output validates in Chrome with 0 errors and 0 warnings and renders
  **pixel-identical** to the hand-written WGSL (mean ΔE 0.000). Prep-kernel
  precision is identical (max relative error 5.96e-8 for both).
- Corrects the r3 review: `SV_Target0/1` multiple render targets work,
  `SV_InstanceID` maps to `instance_index` (so `firstInstance` semantics hold),
  `nointerpolation` maps to `@interpolate(flat)`, and `[[vk::binding(b, g)]]`
  maps to `@binding/@group`, so Slang modules fit the engine's bind group
  layouts unchanged.
- GPU time, 20k draws, median of 3 alternating runs: Slang was 14–20% _faster_
  in two runs and 50% slower in a first single run — noise at this resolution
  (≈1 ms, 100 µs quantization). No evidence of a penalty; the ≤5% gate is
  re-run in M1's benchmark suite with unquantized timestamps.
- Codegen quirks to track: matrices are rebuilt from 16 scalar loads per use
  (transposed for `column_major`); one `i32` field got `@align(8)` (harmless
  here because the offset was already 8-aligned, but a layout risk); the hi/lo
  subtraction kept its grouping. Pin `column_major` in source, since the WASM
  API's sessions take no `-matrix-layout-*` flag.
- Runtime compiler: `slang-wasm.wasm` is 25.1 MB raw, 10.6 MB gzip, 7.7 MB
  brotli, plus 155 kB of JS. Load and instantiate 120–140 ms (local server),
  `createGlobalSession` ≈160 ms, compile opaque + ToonMaterial 220–230 ms cold
  and ≈58 ms warm. Output validates; its text differs from slangc's (different
  naming from linking source vs. precompiled IR) without functional change.
- **Decision input:** build-time Slang is viable as the engine and user
  authoring path. Runtime Slang works but costs ≈8 MB (brotli) and ≈0.5 s
  before the first compile, so it stays lazy, worker-hosted and optional, with
  offline compilation the recommended path, as §3.4 proposed.

### M0 close-out (r8)

**Automated runner.** `packages/next/bench/run.mjs` drives every spike in
headless Edge through Playwright with WebGPU developer features (unquantized
timestamps) and the high-performance GPU, and writes one JSON file per run to
`bench/results/` with the adapter recorded. Playwright's bundled Chromium is
blocked from executing on some locked-down Windows machines, so the runner defaults to the
installed Edge (`BENCH_CHANNEL` overrides). The committed result file is the
reference M0 run on the NVIDIA RTX 3000 Ada laptop GPU.

**FLIP.** `parity/flip.ts` implements LDR-FLIP with separable filters. On
NVIDIA's own test pair (`images/reference.png` vs `images/test.png`, 1920×1080,
67 PPD) it scores **0.159691** against the reference's **0.159693**. Parity
results, mean / p95 per camera:

| Camera   | 2.0 with 1.x color (gamma 2.2) | 2.0 exact sRGB  |
| -------- | ------------------------------ | --------------- |
| oblique  | 0.0376 / 0.0609                | 0.0465 / 0.0649 |
| top-down | 0.0426 / 0.0516                | 0.0525 / 0.0619 |
| grazing  | 0.0276 / 0.0473                | 0.0335 / 0.0553 |
| far      | 0.0019 / 0.0006                | 0.0023 / 0.0006 |

L2 criterion (mean ≤ 0.05, p95 ≤ 0.2) passes everywhere with 1.x color
handling; with exact sRGB only top-down exceeds it, by 0.0025.

**1.x baselines (`bench/baseline.html`)**, matched flat-colored workloads,
one draw per box (as 1.x issues per tile content). `performance.now()` is
coarsened to 0.1 ms on this page, so small 2.0 CPU numbers are upper bounds.

| Hypothesis                     | Workload               | 1.x (WebGL)                                       | 2.0 (WebGPU)                                    |
| ------------------------------ | ---------------------- | ------------------------------------------------- | ----------------------------------------------- |
| H1/H2 per-frame CPU, API calls | 1,000 draws            | 3.6 ms, 6,140 calls                               | ≤0.2 ms, 34 calls                               |
| H1/H2                          | 5,000 draws            | 21.4 ms, 30,140 calls (≈6 per draw)               | ≤0.2 ms, 34 calls (constant)                    |
| H8 creation + first frame      | 5,000 draws            | 637 ms (geometry + shaders built on first render) | 295 ms (to investigate: bundle/canvas setup)    |
| H3 log depth                   | 5,000 draws, on vs off | 21.7 vs 22.2 ms                                   | n/a                                             |
| H5 picking                     | 5,000 draws            | 4.8 ms blocking (pick re-render)                  | ≤0.2 ms main thread; result ≈5 ms later (async) |
| H10 multiple views             | 4 views × 1,000 draws  | 11.9 ms CPU/frame, 4 scene copies                 | ≤0.3 ms CPU/frame, 1 shared world               |

- H3 is not shown by this workload: it is CPU-bound, not fill-bound. It needs a
  fill-heavy scene (dense photogrammetry, M2).
- H4, H6 and H9 need 3D Tiles and the globe (M2–M3).
- Steady-state allocation (GC) measurement needs cross-origin isolation
  (`measureUserAgentSpecificMemory`); added to M1 with the zero-allocation gate.
- Caveat: 1.x does more per frame than this 2.0 prototype (more features in
  its command path), so these ratios overstate what full feature parity will
  keep. They do show where 1.x's cost comes from: work and API calls per draw.

**Slang performance gate.** With unquantized timestamps, two full runs gave
+1.9% and +8.2% GPU time for Slang-generated vs hand-written WGSL at 20k draws
(≈1 ms frames). Run-to-run variation is about ±6% at this scale, so the ≤5%
gate is **not resolved, not failed**. It moves to M1, measured on the PBR shader
(heavier, so codegen differences show) with more rounds.

**M0 exit.** Foundations, multi-view, GPU-driven submission, parity harness
with FLIP, precision, worker, Slang correctness and 1.x baselines are done on
Windows. Carried into M1: the Slang performance gate, steady-state allocation
measurement, the 2.0 first-frame cost, and the per-indirect-call cost
(batching). Deferred: the Metal precision run (done r50: it failed in the
float form and passes in the integer-assisted one, §3.3).

## 11. M1 progress

### Increment 1 (r9): glTF content path and batching

Done:

- **Worker glTF pipeline** (`src/io/`): a worker pool fetches and parses
  glTF/GLB, reads accessors (interleaved, quantized, normalized), composes the
  node hierarchy in float64, converts strips and fans, builds flat normals when
  NORMAL is absent, decodes meshopt (`EXT_meshopt_compression`, fallback
  buffers) and decodes images to `ImageBitmap`. The main thread only uploads.
- **Draw records v1** (176 bytes): per-attribute stream offsets (vertex pulling
  with optional normals, UVs, colors, tangents), bounding sphere center,
  material index, texture set and batch. **Material table** (64 bytes per
  material) and **texture sets** (5 textures + samplers per bind group, 1×1
  defaults). Base color and emissive use `-srgb` formats; mips are generated by
  render passes, since sRGB formats are not storage-writable.
- **Batching**: records sharing mesh, material, texture set and cull mode form
  a batch; the prep kernel compacts visible records per batch and writes one
  indirect draw per batch. The draw index comes from the compacted list bound
  as an instance-step vertex buffer, which also removes the dependency on
  `indirect-first-instance`.
- **Placement** matches 1.x: `modelMatrix × Y_UP_TO_Z_UP × Z_UP_TO_X_UP × node`;
  mirrored transforms are drawn without culling.

Measured (NVIDIA RTX 3000 Ada laptop GPU, `bench/results/…T21-50-01…json`):

| Metric                                  | Before batching (M0) | Increment 1  |
| --------------------------------------- | -------------------- | ------------ |
| 20k identical boxes: indirect calls     | 19,881               | 1            |
| 20k identical boxes: GPU time           | 1.30 ms              | 0.092 ms     |
| 20k identical boxes: frame wall-clock   | 8.7–9.3 ms           | 3.1 ms       |
| Demo (657 records): indirect calls      | 657                  | 514          |
| 1.x vs 2.0 API calls/frame, 5,000 draws | 30,140 vs 34         | 30,140 vs 37 |

Model parity (`parity/models.html`), unlit in both engines, mean FLIP:

| Model           | 2.0 exact sRGB (default) | 2.0 with 1.x color curve (diagnostic) |
| --------------- | ------------------------ | ------------------------------------- |
| Box             | 0.0227                   | 0.0018                                |
| BoxTextured     | 0.0166                   | 0.0020                                |
| BoxVertexColors | 0.0231                   | 0.0020                                |
| BoxInterleaved  | 0.0227                   | 0.0018                                |
| TorusQuantized  | 0.0177                   | 0.0030                                |
| MeshoptCubeTest | 0.0077                   | 0.0057                                |
| BoomBox         | 0.0113                   | 0.0056                                |
| UnlitTest       | 0.0176                   | 0.0022                                |
| TwoSidedPlane   | 0.0095                   | 0.0038                                |
| BoxCutout       | 0.1660 (translucent)     | 0.1526 (translucent)                  |
| Duck            | Draco: not yet           | —                                     |

With 1.x's color curve applied as a diagnostic, geometry, transforms, axis
conventions, UVs, vertex colors, quantization, interleaving, meshopt, texture
filtering and double-sided materials agree to ≤0.006 mean FLIP; the remaining
difference in the default column is the intended sRGB correction.

**Decisions (plan owner, r9).**

- **Correctness over 1.x matching for color.** 2.0 decodes color textures in
  hardware sRGB, filters in linear space and encodes output with the exact sRGB
  curve; 1.x approximates all three with `pow(2.2)` and filters in gamma
  space. Parity is judged on the default (exact) path; the `gamma2.2` model and
  view options remain only as a diagnostic that separates geometry differences
  from color-curve differences.
- **Translucency is clean-slate.** 1.x's WBOIT and its mixing of opaque and
  translucent geometry are not a reference. 2.0 is tested against its own exact
  per-pixel-linked-list mode, including opaque/translucent interaction.
- **One compositor for translucent meshes and splats (r10).** Both feed
  depth-ordered fragment streams into a single compute resolve (§3.5, §3.6), so
  glass, splats and opaque geometry composite correctly together. Its splat
  side (GPU radix sort, tile binning) lands with M6; the mesh side with M4.

### Increment 2 (r11): PBR, image-based lighting, Slang re-port

Done:

- **PBR** (`src/shaders/opaque.wgsl`): glTF metallic-roughness with GGX,
  height-correlated Smith visibility, Schlick Fresnel (Filament-style f90),
  Lambert diffuse; normal maps with glTF tangents or a screen-space cotangent
  frame; occlusion on indirect light only (glTF spec); emissive. Surfaces facing
  away from the sun get no direct light (1.x lets 0.1% through).
- **IBL built by compute shaders** (`src/shaders/ibl.wgsl`,
  `src/gpu/Environment.ts`): environment radiance cube (procedural sky until
  the M4 atmosphere renders into it), GGX-prefiltered specular mips with
  filtered importance sampling, SH9 irradiance by workgroup reduction, and the
  split-sum BRDF table. Fdez-Agüera multiple scattering. Environment frame is
  y-up (east, up, −north) at the camera, the same convention 1.x uses.
- **Correctness fix found by parity**: normals now transform by the
  inverse-transpose (cofactor) and are normalized per vertex before
  interpolation. Quantized glTF (KHR_mesh_quantization) carries non-uniform
  dequantization scales; TorusQuantized went from 0.18 to 0.003 mean FLIP.
- **Slang re-port** to the v1 records with a surface-material interface:
  `IMaterial.surface(SurfaceInput) → Surface` (base color, metallic, roughness,
  normal, emissive, occlusion); the engine owns vertex pulling, sampling and
  lighting. `DefaultMaterial` is the glTF material; `ToonMaterial` extends it.
  Small binding modules (`bind_default.slang`, `bind_toon.slang`) satisfy the
  engine's `extern struct Material_` at link time.

Lit model parity vs 1.x `Model` (same sun; same SH coefficients, computed by
2.0's compute pipeline and fed to 1.x `ImageBasedLighting`), mean FLIP:

| Mode                              | 2.0 exact sRGB | 2.0 with 1.x color curve (diagnostic) |
| --------------------------------- | -------------- | ------------------------------------- |
| Direct sun (9 opaque samples)     | 0.003–0.023    | 0.002–0.006                           |
| Diffuse SH IBL (9 opaque samples) | 0.006–0.023    | 0.003–0.018                           |

TorusQuantized is the high end of the IBL row (0.0175): most likely the IBL
frame, which 1.x anchors at the model and 2.0 at the camera.

Slang performance gate (fragment-heavy: 1920×1080, PBR + IBL, boxes filling
the frame, ≈1.5 ms GPU; median of 7 alternating rounds, unquantized
timestamps): four runs gave −2.6%, +1.7%, +0.2% and +4.8% for Slang vs
hand-written WGSL, mean ≈ +1%. **The gate (≤5%) passes**; run-to-run spread is
about ±4%. Output is pixel-identical (ΔE 0.000) and the hi/lo precision is
identical. Runtime compile of opaque + ToonMaterial via the WASM compiler:
≈380 ms cold, ≈130 ms warm.

### Increment 3 (r12): Draco and KTX2/Basis

Done:

- **Draco** (`KHR_draco_mesh_compression`) decoded in the content workers with
  the official `draco3d` WASM decoder, through its typed-array APIs; integer
  attributes the accessor marks as normalized are normalized after decoding.
  Primitives may mix Draco and plain accessors.
- **KTX2/Basis** (`KHR_texture_basisu`): `ktx-parse` reads the container and
  Binomial's transcoder converts ETC1S/UASTC in the worker to the best block
  format the device supports (BC7, then ASTC 4×4, then ETC2, else RGBA8).
  The main thread writes the transcoded mip levels straight into a
  block-compressed texture. For the PoC the transcoder is the copy vendored in
  the repo; a published package would vendor its own.
- Parity harness: 1.x `Model` now loads with `incrementallyLoadTextures: false`,
  so captures never race 1.x's texture loading.

Model parity, 14 opaque Khronos samples (adds Duck, CesiumMilkTruck,
BoxVertexColorsDracoRGB, BoxTexturedKtx2Basis, BoxMixedCompression), mean FLIP:

| Mode        | 2.0 exact sRGB | 2.0 with 1.x color curve (diagnostic) |
| ----------- | -------------- | ------------------------------------- |
| Unlit       | 0.008–0.025    | 0.002–0.021                           |
| Direct sun  | 0.003–0.023    | 0.002–0.018                           |
| Diffuse IBL | 0.006–0.023    | 0.002–0.018                           |

BoxCutout (translucent) remains the only failure, pending the compute
translucency compositor (M4).

### Increment 4 (r13): allocation gate and first-frame cost

**Allocation gate.** `bench/run.mjs alloc` renders three views (main, an inset
with a footprint link, a second canvas) of N boxes plus a glTF model, and
profiles 300 frames with the V8 sampling heap profiler over CDP, counting
objects already garbage-collected. Allocations are attributed to source
locations and split into engine (`src/`) and harness. A cross-origin-isolated
page wasn't needed: the profiler sees every allocation, not only
`measureUserAgentSpecificMemory` totals.

| Engine bytes/frame | 1,000 draws | 10,000 draws |
| ------------------ | ----------- | ------------ |
| Before             | 44,548      | 40,569       |
| After              | ~1,700      | ~1,450       |

Changes:

- **Frame graphs are built once per view** and rebuilt only when the view's
  pixel rectangle changes. Imported textures are rebound each frame, the
  compiled pass list and release points are cached, and pooled textures keep
  one default view.
- **Pass descriptors, timestamp writes and the present bind group are reused**.
  The present bind group is rebuilt only if the pool hands the view a
  different texture, which doesn't happen in steady state.
- **Texture pool**: cached keys, entries reused, coarse staleness sweep.
- **No per-frame collections**: views are iterated in place, with per-target
  and per-world frame stamps instead of Maps and Sets.
- **Overlays** are flat `Float64Array` line lists with a count, and the
  footprint link writes into them without allocating.
- **GPU timer**: timestamps are decoded as doubles instead of BigInt, and the
  readback callbacks are bound once.

The remainder is roughly 500 bytes per view-frame of V8 number boxing in
calls that take doubles. It scales with views, not draws, and dies in the
young generation. The browser's own WebGPU wrapper objects (encoder, passes,
command buffer, canvas texture view) are excluded; they are inherent to the
API.

**First-frame cost.** Breaking down the old ~180–280 ms 2.0 first frame:

| Phase                                      | Before | After          |
| ------------------------------------------ | ------ | -------------- |
| Startup GPU work after `Engine.create`     | 261 ms | 8 ms + warm-up |
| First frame of the first world (offscreen) | 70 ms  | ~5 ms          |
| First frame into a new canvas              | +11 ms | +11–14 ms      |
| First frame of any later world/view        | 6 ms   | 5–6 ms         |

- The IBL kernels and the mip generator (sky cube plus `rgba8unorm[-srgb]` for
  glTF textures) now compile with the `*Async` pipeline APIs, in parallel with
  the engine pipelines. Before, they compiled synchronously and serialized in
  the GPU process; this also removes a compile hitch on the first glTF
  texture upload.
- Dawn (Chrome's WebGPU implementation) builds its indirect-draw validation
  lazily, which cost the first frame with any draw ~70 ms. `Engine.create`
  now submits a 1×1 warm-up frame with one draw and doesn't await it, so that
  work overlaps the app's loading.
- The baseline suite now lets the GPU settle before each engine's
  first-frame timing, so 1.x teardown no longer lands in 2.0's number.

Draw scaling, first frame including GPU (results
`2026-10-29T22-56-43-522Z`):

| Draws | 1.x WebGL | 2.0 WebGPU |
| ----- | --------- | ---------- |
| 1,000 | 203 ms    | 23 ms      |
| 5,000 | 691 ms    | 34 ms      |

Parity, model parity and the Slang perf gate (+0.6%) are unchanged.

### Increment 5 (r14): CAD content, the M1 exit test

Done:

- **Per-vertex feature IDs.** `EXT_mesh_features` attribute feature IDs, or
  `_BATCHID` in b3dm, are a u32 stream in the vertex arena, located by the
  draw record's last free word. Each draw gets a range of world-unique pick
  IDs: the vertex shader adds the draw's first ID to the local ID and passes
  it flat to the feature-ID target. `World.feature(id)` resolves a pick by
  binary search over the ranges to the draw, the local ID, a display name
  and the feature's properties.
- **Feature properties.** `EXT_structural_metadata` property tables (scalars,
  vectors/matrices, strings, booleans, enums, `offset`/`scale`/`normalized`,
  `noData`, defaults), and b3dm batch tables (JSON and binary). Feature-ID
  textures, property textures/attributes and variable-length arrays are not
  supported yet (warnings).
- **b3dm**: current and both deprecated header layouts, `RTC_CENTER`
  (applied as `modelMatrix × RTC × axis correction × node`, as 1.x), and the
  3D Tiles axis convention (y-up, x-forward; 1.x `Model`'s glTF default is
  z-forward).
- **Line primitives** (LINES/LINE_STRIP/LINE_LOOP) through a line-list
  pipeline variant in their own batches, drawn unlit like 1.x. Points are
  still M6.
- **ion**: `resolveIonAsset` exchanges an access token for the asset
  endpoint; content workers send its headers with every request, and the
  asset version query propagates to relative URIs as in 1.x `Resource`. For
  local testing the token lives in `packages/next/.env.local`
  (`VITE_ION_TOKEN`, gitignored).
- **Tileset parity page** (`parity/tileset.html`, runner suite `tileset`).
  1.x streams the tileset with `maximumScreenSpaceError` 0 until every tile is
  loaded. 2.0 walks the tileset (tile transforms, REPLACE/ADD, external
  tilesets) and places full-detail content directly; streaming and selection
  are M2. Both engines pick a 7×5 pixel grid 1×1 and compare a feature
  property. 1.x's default 3×3 pick window resolves edge pixels differently,
  and it returns 64-bit integers as BigInt, so values compare by string.
- **Feature-ID model in model parity**: `BuildingsMetadata`.
- **Deterministic baseline first-frame timing.** Draw scaling now runs every
  2.0 count before any 1.x count. 1.x viewer teardown continues
  asynchronously in the GPU process even after `finish()` and
  `loseContext()`, and landed in 2.0's first frame (≈90 ms). Each timing is
  preceded by a forced major GC (the runner exposes `gc`) and an idle WebGPU
  queue, with no sleeps.

Results (`2026-10-29T23-33-08-722Z`):

| Test                                                | Mean FLIP (sRGB / 1.x color) | Picks vs 1.x                      |
| --------------------------------------------------- | ---------------------------- | --------------------------------- |
| BuildingsMetadata, unlit / direct / diffuse IBL     | 0.010–0.022 / 0.004–0.018    | 35/35 (10 features hit)           |
| b3dm tilesets (JSON, binary batch table, transform) | 0.002 / 0.002                | 35/35                             |
| iModel-derived CAD tileset, whole-site view         | 0.010 / 0.009                | 35/35                             |
| same, close-up of the building                      | 0.066 / 0.050                | 31/35, all 4 in translucent areas |
| same, facade close-up                               | 0.135 / 0.097                | 35/35 (35 features hit)           |

The private CAD tileset is run locally with `ION_ASSET=<id>` and is not part
of the committed results. Its remaining differences are translucency:
window glass and a translucent roof volume, which 2.0 draws opaque until the
M4 compositor. Its element IDs are 64-bit and pick identically.

The M1 exit criterion is met: the Khronos samples and a CAD glb pass L2
against 1.x, with feature-ID picking, except translucent materials (M4).

Open, for later:

- **CAD display extensions**: `BENTLEY_materials_planar_fill` (`behind`),
  `EXT_mesh_primitive_edge_visibility` and `BENTLEY_materials_line_style` /
  `point_style`, which 1.x implements. The CAD content tested so far uses
  none of them. 2.0 already writes the per-pixel feature ID that `behind`
  needs during the opaque pass, so a later pass can apply the same-feature
  depth offset without 1.x's prepass.
- **Edge/face coplanarity**: investigate depth behavior of CAD edges lying on
  their faces once content with real edges is available. A preemptive line
  depth offset was tried and dropped until a failure is observed.
- Line width and dashes (`line_style`) need quad expansion: WebGPU lines are
  1 px.

Next increments:

1. Specular IBL parity (needs feeding 2.0's prefiltered cube to 1.x, or a
   2.0-only reference render).
2. M2: streaming and 3D Tiles selection (`TileSource`, `Stepwise`, `Budgeted`).

## 12. M2 progress

### Demo viewer (r15)

`/viewer/` shows the PoC's state in a browser: sample glTF models, 3D Tiles
samples at full detail, Cesium ion assets (token in the gitignored
`packages/next/.env.local`) and a synthetic city. It has inspection
navigation (`InspectController`: orbit a focus point, pan, zoom), sun and
lighting controls, exposure, output encoding, an unlit toggle, a linked
overview inset, click-to-pick with feature properties, live stats and content
warnings. Selections are deep-linkable (`?model=`, `?tileset=`, `?asset=`,
`?scene=city`). Georeferenced glTF models (Earth-fixed node translations) are
placed at their own position. The context globe draws one mesh per latitude
band, rotated, so it costs 16 batches rather than 512.

### Foundations (r15)

- **Freeing placed content.** Meshes release their arena ranges. Material
  slots and texture sets go on free lists. Removing a draw decrements its
  batch and recycles empty batches with their index kept, so live records
  stay valid. `Engine.removeModel` frees everything a glTF instance created,
  and instances report their GPU bytes for the cache budget. This also fixes
  a latent overflow: `removeDraw` used to leave batch sizes stale. Verified
  with 20 add/remove cycles of a Draco, textured model: the arena returns to
  baseline with no validation errors.
- **Per-view view masks.** Each draw record carries a 32-bit `viewMask`
  (the record grows to 192 bytes) and each view gets a stable bit
  (`Engine.viewBit`). The prep kernel skips records not selected for the view
  being culled. One shared draw table can therefore carry different LOD
  selections per view: the basis for multi-view tile selection.

### `Stepwise` selection spec (from the 1.x base traversal)

`Stepwise` must reproduce 1.x's default, non-skip-LOD selection exactly
(L1 ≥ 99% Jaccard). The rules that matter, from
`Cesium3DTilesetBaseTraversal.js`, `Cesium3DTilesetTraversal.js` and
`Cesium3DTile.js`:

- **SSE** = `geometricError × drawingBufferHeight / (max(distance, 1e-7) ×
2 tan(fovy/2))` (fovy derived from fov and aspect), divided by `pixelRatio`.
  Default threshold 16. The geometric error is scaled by the transform's
  maximum scale component.
- **Dynamic SSE is on by default and changes selection.** It subtracts
  `fog(distance, density) × 24` with `fog(d, k) = 1 − exp(−(d·k)²)`. The
  density is `2e-4 × (1 − |dir·up|) × (1 − t)`, with `t` from the camera
  height within the root content volume (falloff 0.25).
- **Distance** is to the tile's bounding volume, not a sphere: the closest
  point on the OBB for boxes; for regions, the max of the region-plane
  distance and the OBB distance from `OrientedBoundingBox.fromRectangle`.
  Frustum culling uses six planes with OBB `intersectPlane` and a parent
  plane mask.
- **Traversal.** Root early-out uses the parent-style SSE. A tile traverses if
  it has children and SSE > threshold. Visible children are always pushed,
  nearest first, so whole needed subtrees get requested. REPLACE selects a
  tile when it stops refining. A REPLACE parent with content refines only if
  every child, visible or not, has content available (or is empty and its
  empty subtree is loaded) and is inside its request volume, and at least one
  child is visible. ADD selects every visited tile. Selection also requires
  the content bounding volume to be in view.
- **Visibility extras that change the set:** children-bounds culling (on by
  default for box/region trees whose children project within the parent),
  `meetsScreenSpaceErrorEarly` for children of ADD tiles, viewer request
  volumes, and the memory-adjusted SSE (×1.02 per frame over the 512 MiB
  budget).
- **Request-only behavior** (not selection): foveated deferral, which only
  affects ADD tiles in the base traversal; progressive resolution;
  cull-requests-while-moving; the priority digits; and cancellation of
  untouched in-flight requests.

### Increment 1 (r16): streaming with `Stepwise` selection

Done:

- **Bounding volumes** (`streaming/volumes.ts`): ports of 1.x's OBB
  (including degenerate axes), `OrientedBoundingBox.fromRectangle` (both the
  ≤ π and > π branches), `TileBoundingRegion` edge planes and distance, and
  sphere volumes. Unit-tested against 1.x core and engine modules at 1e-9
  relative tolerance: random regions (hemispheres, equator, antimeridian,
  wider than π), boxes and planes.
- **Tile tree** (`streaming/Tile.ts`): explicit tilesets, external tilesets
  loaded on demand, transforms, refine inheritance, viewer request volumes,
  content volumes and the children-within-parent optimization.
- **`Stepwise`** (`streaming/Stepwise.ts`): the 1.x base traversal rule for
  rule (§12 spec), including dynamic SSE, children-bounds culling,
  `meetsScreenSpaceErrorEarly`, empty-subtree refinement, plane-mask frustum
  culling with 1.x's far plane, and content-volume culling at selection. Per-view
  state lives on the tiles, so one tree serves every view.
- **`Tileset3D`**: per frame, selection runs for each view of the world; tiles
  get the union of their views' bits as the record view mask, so each view
  draws its own LOD from one shared draw table. Requests are nearest-first
  with 18 in flight, uploads are capped per frame, and eviction is LRU over
  untouched tiles above a 512 MiB budget. Unsupported formats (pnts, i3dm,
  cmpt) load as empty content with a warning, so selection and refinement
  still match 1.x, which decodes them.
- **`Engine.addTileset`** builds selection inputs per view: float64
  world-space planes, SSE denominator, and height ÷ pixel ratio.
- **Viewer** streams tilesets and ion assets with live tile, selection and
  cache stats. The ground patch toggles in place and starts hidden for
  georeferenced tilesets, which can sit below the ellipsoid (underground infrastructure).

**L1 selection parity** (`parity/selection.html`, runner suite `selection`).
2.0 renders 3–4 cameras at once as views over one shared cache; 1.x renders
each camera with a stock `Cesium3DTileset` until settled. Jaccard over
selected content:

| Tilesets                                                                                      | View comparisons | Jaccard   |
| --------------------------------------------------------------------------------------------- | ---------------- | --------- |
| 9 public Specs tilesets (REPLACE/ADD, external, empty, request volumes, transforms, quadtree) | 36               | 100% each |
| 3 iModel-derived CAD tilesets (private; run with `ION_ASSET`)                                 | 4 each           | 100% each |

A 1.x bug surfaced along the way. A tileset without the (required) top-level
`geometricError` makes 1.x compute `NaN` for the root's early-out SSE, so it
always traverses the root; iTwin's publisher omits the field. `Stepwise`
copies this, with a warning. `Budgeted` should fall back to the root's error,
and the bug is worth filing against 1.x.

Results: `2026-10-30T00-18-53-878Z` (all suites; the Slang gate read +5.7%
in that run and +1.8%, +3.3%, −1.6% on reruns).

Notes for `Budgeted`, from viewing the CAD tilesets:

- **Silhouettes matter for design models.** iTwin's coarse tiles drop small
  elements, so at the viewer's default distance an underground CAD model shows less than a
  user expects, exactly as 1.x does. `Budgeted` should weigh silhouette loss
  (e.g. refine sooner when children carry geometry the parent lacks).
- A track that ends at the edge of the default view may be in the data
  itself. Check it against full detail when testing `Budgeted`.

### Increment 2 (r17): OSM Buildings, resize robustness, viewer tooling

- **Cesium OSM Buildings streams** (3D Tiles 1.0, b3dm, ADD refinement,
  nested external tilesets, a planet-sized root region). L1 selection parity
  with four simultaneous views at absolute ranges around a location
  (`?at=lon,lat`): **100%** over Philadelphia (14–21 tiles per view) and
  Midtown Manhattan (16–20). In the viewer, Manhattan loads in about 0.5 s:
  24 of 13,224 known tiles, 0.5 ms CPU and 0.9 ms GPU per frame.
- **`3DTILES_batch_table_hierarchy`** (OSM's per-building properties):
  classes, binary and JSON references, multiple parents, inheritance through
  ancestors as 1.x `getProperty`. Tested on 1.x's three hierarchy samples.
  OSM picks now return names, addresses, OSM ids and estimated heights.
- **Resize robustness.**
  - Frame ordering: targets were acquired (and canvases resized) after view
    rectangles were computed, so during a resize the present pass's scissor
    could exceed the new canvas. The frame was rejected (129 validation
    errors in a scripted resize storm). Targets are now acquired first.
  - Render-target memory: a view that changes size frees its old-size
    targets immediately unless another view still uses them, and idle pool
    textures have a 256 MiB budget, evicted after submit. In a 120-frame
    resize storm with two views, resident render targets peaked at 256 MB
    and returned to the 112 MB working set, with zero errors.
  - The viewer reports device loss instead of freezing.
- **Overview link stability.** Ground points are continuous: rays that miss,
  or hit beyond max(20 × altitude, 5 km), use the capped point dropped to the
  surface. The footprint stays closed, and the inset no longer jumps when the
  main camera looks toward the horizon.
- **Viewer.**
  - Split view: a second independent camera with its own selection over the
    shared cache.
  - A memory panel with live meters (arenas, draw records, materials, render
    targets per frame and resident against the idle cap, tile cache against
    its budget, requests in flight, upload queue) and 30-second sparklines.
  - Collapsible sections with remembered state; only the panel scrolls.
- Engine allocations are 2.1–2.5 KB per frame (from ~1.6): the overview
  link's continuous ground points, exercised by the allocation scene. Still
  independent of draw count.

Notes for `Budgeted`:

- A small view (an inset) selects far coarser tiles than the main view,
  exactly as a small 1.x viewer would. In one engine, the finer tiles another
  view already holds can be drawn at no bandwidth cost: opportunistic
  refinement from the shared cache.

Results: `2026-10-30T00-40-56-567Z`.

### Increment 3 (r18): photogrammetry

- **Google Photorealistic 3D Tiles** stream through ion. `resolveIonAsset`
  handles external assets: ion returns the provider URL with its key and no
  ion token, and the session query propagates to child requests. Required
  attributions (Cesium ion and Google logos) and per-tile data credits
  (glTF `asset.copyright`, most frequent first, as 1.x) show in a credit bar
  in the viewer.
- **Memory-adjusted SSE**, ported from 1.x `processTiles`: uploads pause
  above budget + overflow (512 + 512 MiB), the threshold rises ×1.02 per frame
  while content waits, and relaxes back below budget. The viewer meter shows
  budget, overflow and the current SSE.
- **Selection keys.** Tiles are compared by their header (JSON bounding
  volume and geometric error). Google's content URLs carry per-session
  tokens, and 1.x sorts `children` in place by distance, so neither URLs nor
  tree paths are stable across engines.
- **A bug in the port, found by photogrammetry.** 1.x computes a tile's raw
  visibility once per frame but reapplies the traversal-level checks
  (external-tileset copy, ADD early-out, children-bounds culling) on every
  update. The port guarded both with one flag, so when a parent's
  children-bounds check had already evaluated a child, the child skipped its
  own children-bounds check and stayed visible. Planet-scale REPLACE trees
  exposed it: 84–96% Jaccard before the fix, 100% after.

L1 selection parity (`2026-10-30T00-55-07-567Z`; private assets run locally):

| Data                                    | Views | Tiles per view | Jaccard      |
| --------------------------------------- | ----- | -------------- | ------------ |
| 9 public Specs tilesets                 | 4     | 1–17           | 100% (36/36) |
| Google Photorealistic 3D Tiles, Midtown | 4     | 22–164         | 100%         |
| Cesium OSM Buildings, Midtown           | 4     | 16–20          | 100%         |
| iModel-derived CAD tilesets (3)         | 4     | 0–5            | 100%         |

The M2 exit criteria are met for `Stepwise`: OSM Buildings, a CAD tileset and
photogrammetry stream, with ≥ 99% L1 in multiple views (100% measured).
`Budgeted` and its L1′ measurement remain.

### Open design question: memory management

See §13.6 for the fuller notes. 1.x's static 512 + 512 MiB per tileset is
the parity default, not a design. To work out before `Budgeted` and M5:

- One engine-wide GPU budget shared by tilesets, render targets and textures,
  arbitrated by benefit/cost across tilesets and views, rather than caps per
  tileset.
- Sizing: WebGPU exposes no VRAM query. Candidates are adaptive signals
  (allocation failures, frame time, device loss), platform heuristics, and
  an application hint.
- Cheaper residency: Google's JPEG textures become RGBA8 with mips, about 4×
  the size of a GPU block format. Worker transcoding to BC7/ASTC trades
  decode time for memory.
- What eviction keeps (decoded CPU copies vs refetching), and how tile memory
  interacts with the per-view LOD choice when views compete.

### Increment 4 (r19): `Budgeted` v1 and L1′

`Tileset3D` takes `policy: "stepwise" | "next"` (default `stepwise` until
`Budgeted` wins on every L1′ metric). `Budgeted` shares 1.x's visibility, distance
and dynamic SSE and replaces the refinement rules:

- **Skip-LOD with bounded skipping.** The SSE frontier is requested directly;
  a base level loads where nothing is resident, and an intermediate level
  every 3 levels (`skipLevels` 2).
- **Visible-only coverage.** A REPLACE tile is replaced once its visible
  children are covered.
- **Cache reuse.** Resident finer content is drawn in place of a frontier
  tile, down to a quarter of the threshold.
- **Region-grouped requests.** Frontier requests are ordered by the region
  (loaded ancestor) they will replace, nearest first.
- **1.x's NaN root error** falls back to the root tile's error.
- Content-less tiles (empty, expanded external tilesets) always refine and
  never count as covering a region. The first version did, which left holes
  over Google's external-tileset chains until their content arrived; a
  snapshot at 300 ms after the jump showed it.

**L1′** (`parity/lod.html`, runner suite `lod`). One move per policy: settle
at 6 km, jump to 450 m over the same spot, measure from the jump until
settled. Image error is FLIP against a fully refined reference (SSE 2).
Google Photorealistic 3D Tiles over Midtown:

| Policy                  | Requests | MB  | Settle | FLIP @250 ms | @1 s  | Settled |
| ----------------------- | -------- | --- | ------ | ------------ | ----- | ------- |
| `Stepwise` (1.x)        | 315      | 426 | 3.3 s  | 0.499        | 0.421 | 0.148   |
| `Budgeted`              | 147      | 222 | 2.0 s  | 0.564        | 0.564 | 0.148   |
| `Budgeted`, 64 requests | 147      | 222 | 1.3 s  | 0.564        | 0.148 | 0.148   |

`Budgeted` fetches less than half the data for the same final image and settles
faster. 1.x's cap of 18 concurrent requests alone costs about 0.7 s here
(HTTP/2 and decode capacity, not connections, are the real limits now). The
remaining gap is in-between quality: `Budgeted` keeps a region's coarse
ancestor until all its visible frontier tiles have arrived, while 1.x's
level-by-level refinement (at twice the bytes) improves in small steps.

**Next step: mixed-LOD drawing** (§13.1).

### Increment 5 (r21): mixed-LOD drawing

- Records carry a placeholder depth offset (meters, f32) and a per-view
  placeholder mask. The vertex shader moves a placeholder's vertices along
  the camera ray by the offset: screen position unchanged, depth pushed
  back. The offset is the tile's geometric error, the bound on its surface
  deviation. Ported to Slang.
- `Budgeted` returns covers (tiles plus completeness). An incomplete cover keeps
  the finer content that has arrived; the nearest loaded ancestor draws under
  it as a placeholder, in that view only. Regions sharpen tile by tile.

L1′, Google Photorealistic 3D Tiles over Midtown
(`2026-10-30T01-23-54-061Z`):

| Policy                              | Requests | MB  | Settle | FLIP @250 ms | @1 s      | Settled |
| ----------------------------------- | -------- | --- | ------ | ------------ | --------- | ------- |
| `Stepwise` (1.x)                    | 315      | 426 | 3.5 s  | 0.499        | 0.421     | 0.148   |
| `Budgeted` + mixed LOD              | 147      | 222 | 2.1 s  | 0.499        | **0.220** | 0.148   |
| `Budgeted` + mixed LOD, 64 requests | 147      | 222 | 1.6 s  | 0.499        | 0.288     | 0.148   |

OSM Buildings (ADD refinement, shallow) is identical under both policies.
Frames at 400, 800 and 1300 ms after the jump show fine tiles over
placeholders, with no holes or visible z-fighting.

### A second 1.x selection bug

Near the Brooklyn Bridge, 1.x (and `Stepwise`, at 100% parity there) draws a
coarse tile at SSE 446, 30× the threshold, as a dark blocky rectangle over
the water. Mechanism:

1. A REPLACE parent is visible: its loose bounding box touches the frustum.
2. Each child is then marked invisible by children-bounds culling
   (`cullWithChildrenBounds`, on by default), because none of that child's
   own children intersect the view.
3. "No visible children → don't refine" fires, and the parent is selected.

The parent's own children-bounds check uses its children's raw visibility,
but the refinement decision uses their culled visibility. With loose
volumes (Google's) the two disagree, and a very coarse tile is drawn where
nothing, or the finer tiles, should be. `Budgeted` treats a region with no
visible children as empty and shows the correct detail there.

### Increment 6 (r22): hold, prefetch, clipped mixing; design models

The r21 depth offset was the wrong mechanism (§13.1): placeholders fell
behind unrelated surfaces and the context globe, jumped as tiles changed
role, and textures swam. Removing it exposed a worse problem it had been
hiding: rotating brought an unloaded tile into view, the region fell back to
its nearest loaded ancestor (near the root, since levels were skipped), and
selection dropped from about 400 tiles to 3 for a second. Pulling back did
the same.

- **Hold** (both directions) and **zoom-out hold**: a view keeps what it
  drew last frame until the replacement is complete.
- **Prefetch band**: a wider frustum loads what would display just off
  screen, at the lowest priority and 2× the SSE threshold.
- **Clipped mixing**, only where children partition their parent
  (`mixedLod: "auto"`): the ancestor draws at its true depth inside its
  missing descendants' boxes, discarded per fragment elsewhere. Clip boxes
  live in a per-world buffer, one block per placeholder tile, stored hi/lo
  and tested camera-relative. Ported to Slang.
- **Missing top-level `geometricError`** (iTwin exports): `Budgeted` used the
  root's error to decide whether to hide the whole tileset, and a zoomed-out
  design model vanished. The root's error now only drives refinement; the
  tileset is never hidden, as in 1.x.
- **iTwin mesh export**: `resolveITwinIModel` (share key or access token),
  as 1.x `ITwinData`; the viewer takes `?imodel=` and L1′ takes `IMODEL=`.
- Viewer: a live maximum-SSE slider and a placeholder count.

L1′, Google Photorealistic 3D Tiles over Midtown, unthrottled
(`2026-10-30T02-03-44-893Z`):

| Move     | Policy                | Requests | MB  | Settle | FLIP @250 ms | @1 s      | Settled |
| -------- | --------------------- | -------- | --- | ------ | ------------ | --------- | ------- |
| jump in  | `Stepwise` (1.x)      | 315      | 426 | 3.2 s  | 0.499        | 0.421     | 0.148   |
| jump in  | `Budgeted`, no mixing | 217      | 271 | 1.8 s  | 0.499        | **0.155** | 0.148   |
| jump in  | `Budgeted`, mixed     | 217      | 271 | 1.7 s  | 0.499        | 0.160     | 0.148   |
| zoom out | `Stepwise` (1.x)      | 40       | 26  | 1.4 s  | 0.490        | 0.490     | 0.490   |
| zoom out | `Budgeted`            | 27       | 19  | 1.4 s  | 0.496        | 0.496     | 0.496   |
| pan      | `Stepwise` (1.x)      | 93       | 154 | 1.5 s  | 0.533        | 0.554     | 0.554   |
| pan      | `Budgeted`            | 83       | 132 | 1.4 s  | 0.548        | 0.554     | 0.554   |

Hold and prefetch improved `Budgeted`'s jump-in FLIP at 1 s from 0.220 (r21) to
0.155. Prefetch costs about 70 requests and 50 MB, still 35% fewer bytes than
1.x. Mixing makes no measurable difference here: requests are grouped by
region, so regions complete together and partial states are brief on a fast
network.

**Throttled L1′** (20 Mbit/s shared link, 80 ms latency, no cache; applied
at Playwright's request router, which also sees worker fetches; CDP network
emulation can't attach to workers). L1′ now also reports **FLIP avg**:
FLIP sampled every 500 ms from the move until settled, so it rewards a
good image while loading, which fixed marks miss on slow links. The runner
serves pages from its own Vite server with watching and HMR off, so edits
can't reload a run.

Midtown, jump in (`2026-10-30T02-44-06-405Z`):

| Policy                | Requests | MB  | Settle | FLIP @1 s | FLIP avg  | Settled |
| --------------------- | -------- | --- | ------ | --------- | --------- | ------- |
| `Stepwise` (1.x)      | 315      | 426 | 25.9 s | 0.499     | **0.267** | 0.148   |
| `Budgeted`, no mixing | 217      | 271 | 17.4 s | 0.499     | 0.288     | 0.148   |
| `Budgeted`, mixed     | 217      | 271 | 17.4 s | 0.499     | 0.279     | 0.148   |
| `Budgeted`, 64 req.   | 217      | 271 | 17.4 s | 0.499     | 0.319     | 0.148   |

**Correction (r23):** the average below ran only until each policy
settled, which favors slow policies (a long tail of near-final images
lowers the mean). Averaged over a common horizon per move (the slowest
settle, each policy held at its settled image), `Budgeted` beats 1.x on
both links: jump-in FLIP avg throttled 0.225 (18 requests) and 0.251
(adaptive) vs 0.274 for 1.x; fast 0.189 (adaptive) vs 0.278
(`2026-10-30T03-55-56-593Z`, `03-56-55-728Z`). The adaptive window is best
on fast links and second on slow ones; tuning it there is planned work.
The paragraph below is kept as originally written.

On a slow link 1.x looks better on average while loading, though it settles
8.5 s later on 57% more bytes: loading every level improves the image in
small steps, while `Budgeted` skips levels and a region stays coarse longer.
Mixing narrows the gap a little. More concurrency hurts on a saturated
link: 64 parallel requests split the bandwidth, so everything arrives later
and together instead of nearest first. Consequences: adaptive concurrency
grows only while throughput rises (§13.2), and how many levels `Budgeted` skips
should follow bandwidth (skip on fast links, load intermediate levels on
slow ones), which is §13.3's benefit per byte. Pan: equal FLIP avg (0.546
to 0.549), `Budgeted` 7.4 s vs 8.0 s. Zoom out: equal within noise (one `Budgeted`
run settled in 7.0 s against 2.0 to 2.4 s for the others; to recheck).

Design models (the station iModel pair, iTwin mesh export, throttled): the
station jumps in 7.3 s (`Budgeted`) vs 10.8 s (1.x) on 25 vs 37 MB with equal
FLIP; the surrounding area 19.6 to 19.8 s vs 20.6 s on 64 vs 66 MB. Mixing
never engages (their children overlap, so `auto` keeps whole-region swaps),
and zoomed out `Budgeted` now draws the root as 1.x does. The default L1′
cameras (from the root sphere) suit compact tilesets poorly; long, thin
models need cameras along their axis.

**Content pipeline diagnostics.** Each content load is timed per stage:
queued (wanted until a request slot frees), network and decode (in the
worker), worker wait, upload wait (the per-frame upload cap) and upload.
`Tileset3D.pipeline()` gives p50 and p95 over the last 256 loads;
`Tileset3D.resident` sums what loaded content holds (formats, triangles and
lines, geometry vs texture bytes, image types, features). A single glTF
model reports the same stages. The viewer shows them in a Content group, a
status line (streaming or idle), a load timeline (resolve, root, first
content, settled) and a "last move" row (settle time, requests and bytes
after each camera move), plus history lines for bytes received, requests
in flight against the cap, upload queue and decode time.

First readings, Midtown in the viewer (`Budgeted`, unthrottled):

- **Queued p50 3.0 s, p95 4.4 s; network p50 133 ms.** Tiles wait about 3 s
  for one of the 18 request slots, then download in a seventh of a second.
  The cap, not the network, dominates (§13.2).
- **111 MB received became 543 MB of textures** (JPEG decoded to RGBA with
  mips, about 8× its wire size; 953 MB resident in all). Texture transcoding
  (§13.6) is the largest memory lever for photogrammetry.
- **Prefetch and hold keep content resident:** tiles they touch can't be
  evicted, so the cache sat near budget + overflow (953 of 1024 MB). Prefetch
  should yield to the budget before the memory-adjusted SSE rises.

Next:

M2 close-out:

1. Adaptive request concurrency (`RequestScheduler`, r23): wins on fast
   links; slow-link fix (ProbeRTT, transfer-corrected latency, latency-based
   startup exit) being measured.
2. `TileSource`: one streaming abstraction for 3D Tiles, quantized-mesh
   terrain and imagery, sharing the scheduler, cache and per-view selection.
3. One engine-wide cache budget across tilesets, terrain and imagery
   (§13.6), replacing per-tileset 512 + 512 MB.

Then M3 (globe), then the planned `Budgeted` selection work (§6): budget-driven refinement, multi-view
priority, silhouettes and HZB feedback, worker traversal over an SoA tile
table, paging and readahead lessons, a second photogrammetry city.

Done along the way: `Budgeted` is the default (parity harnesses pin
`stepwise`); rendering is on demand, per view, including views sharing a
canvas (§13.8).

## 13. Design notes: tile selection and memory beyond `Stepwise`

The `Budgeted` policy was called `Next` until r23 (renamed for its goal:
spend limited memory, bandwidth and requests where they improve the image
most, without leaving holes).

Working notes for the `Budgeted` policy and the engine's memory model, written
during M2 so the ideas survive the session. Each item states the problem,
the approach in this engine, and how L1′ (or another harness) measures it.
`Stepwise` stays as the parity reference throughout. Nothing here changes it.

### 13.1 Mixed-LOD drawing

**Problem.** `Budgeted` replaces a coarse ancestor only once every visible
frontier tile under it has arrived, so a region stays coarse and then
changes all at once. 1.x looks progressive only because it loads every
level, at about twice the bytes (L1′, r19).

**What 1.x does.** By default it never mixes levels: a parent swaps for all
its children at once, one level at a time. With `skipLevelOfDetail`
(opt-in) it mixes through the stencil buffer: finer tiles draw first and
mark their pixels with their selection depth, ancestors draw only where
nothing finer did, and a back-face pass of unresolved tiles keeps that
depth-correct. Its source documents remaining artifacts (back-facing child
content drawn over ancestors).

**First attempt, dropped (r21).** Push the ancestor back in depth by its
geometric error, so finer content wins the depth test. Wrong in principle:
depth priority isn't spatial priority. The pushed-back tile falls behind
unrelated surfaces (neighbors, the context globe), which then show through
and jump as tiles start and stop being placeholders. Moving vertices along
the ray also changed clip w, so textures swam.

**Approach (r22): clip the ancestor to its holes.** The ancestor draws at
its true depth, but only inside the bounding boxes of its missing
descendants, tested per fragment against up to 8 oriented boxes per tile.
Where finer content exists the ancestor doesn't draw, so no depth tricks,
and selection stays in the single GPU-driven pass. Boxes grow vertically by
the ancestor's geometric error (its surface may lie that far above or below
the finer content) but not sideways, so they don't spill over finer
neighbors.

This is only sound where children partition their parent: photogrammetry,
terrain-like quadtrees and octrees. Design models subdivide by element, so
child boxes overlap heavily and coarse tiles drop whole elements; there,
mixing either leaves holes or changes the silhouette piece by piece. `Budgeted`
decides per tile (`mixedLod: "auto"`): it mixes when the children lie
within the parent and their box volumes sum to at most 1.25× the parent's,
and otherwise swaps whole regions as 1.x does.

**Independent of mixing:**

- **Hold.** A coarse tile that a view drew last frame stays until its
  region is complete. Finer tiles a view drew last frame stay while a newly
  visible neighbor loads; without this, one unloaded tile coming into view
  collapsed the whole region to its nearest loaded ancestor, which with
  skipped levels was near the root (rotation showed a coarse globe for
  about a second). Zooming out, resident finer content draws until the
  coarser tile arrives.
- **Prefetch.** A guard band around the frustum (half-angle tangents
  × 1.25) loads what would display there, at the lowest priority and 2×
  the SSE threshold (about a quarter of the bytes), so rotation reveals
  coarse content instead of gaps.

**Measure.** L1′ FLIP at 250 ms and 1 s with and without mixing, on
photogrammetry and on a design model; time to settle and bytes no worse.
Later: dithered cross-fades for whole-region swaps, and FLIP between
consecutive frames with a static camera as a popping metric.

### 13.2 Request scheduling

- **Adaptive concurrency.** 1.x caps at 18 per server, an HTTP/1.1-era limit.
  With HTTP/2 and HTTP/3 the real limits are bandwidth × latency and worker
  decode throughput. Raise concurrency while delivered bytes per second keep
  rising, and back off when latency climbs or the decode queue backs up
  (AIMD). L1′ on Google: 18 → 64 requests cut time to settle from 2.0 s to
  1.3 s (r19); with prefetch the gain is smaller (r22).
- **Protocol-aware, per origin.** One limiter per origin, shared by every
  tileset on it, owns the window and the priority queue (the queue is not
  built yet: see "Scheduling across tilesets" below). The protocol comes
  from Resource Timing (`nextHopProtocol`: `http/1.1`, `h2`, `h3`, also in
  workers; cross-origin servers must send `Timing-Allow-Origin`, else it is
  empty). It seeds the window: about 6 for HTTP/1.1 (the browser's
  per-host connection limit), about 32 for HTTP/2 and 3; AIMD adapts from
  there. Unknown protocol: start low and infer it (time to first byte jumps
  once requests exceed the browser's connection limit). On HTTP/1.1,
  requests beyond that limit queue inside the browser, where they can be
  neither reprioritized nor cancelled. Keeping the queue on our side is the
  real purpose of a cap, which 1.x's fixed 18 only approximates.
- **Implemented (r23): `RequestScheduler`,** one window per origin shared
  by its tilesets. Seeded by the protocol, then modeled as TCP BBR does:
  the highest recent delivered throughput and the lowest recent request
  latency give, by Little's law, the requests needed to keep the link busy
  (throughput × latency / request size + 1); more only queues. Startup
  doubles while throughput grows 25% per period; the window cycles 1.25× /
  0.75× around the target to keep measuring; periods that didn't fill the
  window don't count; cache hits don't count as latency; after idle the
  next burst starts up again (TCP's slow-start restart); it holds while
  decoded content backs up behind the upload. HTTP/1.1 stays at 6 or
  below. `maximumRequests` pins the window.
- **Cancellation.** Drop queued and in-flight requests no view still needs
  (1.x cancels requests for untouched tiles). Our worker decode isn't
  abortable yet: pass an `AbortSignal` to `fetch` in the worker and discard
  late results.
- **Decode-aware priority.** Cost includes decode time: Draco, KTX2 and JPEG
  decode differently. Estimate it per format from history.
- **Upload budget in milliseconds,** measured, rather than a count of tiles
  per frame. Uploads share the queue with rendering.

**Lessons from operating systems and networking** (where these problems
were solved first):

- **Congestion control:** model the bottleneck (BBR), not just react to
  loss or delay (AIMD); Little's law sizes the window. Implemented above.
- **Readahead:** the OS grows its prefetch window while prefetched pages get
  used and shrinks it when they don't. Size the prefetch band (§13.5) by its
  hit rate: prefetched tiles later displayed vs evicted unused.
- **Fair queueing** (weighted fair queueing, deficit round robin): share an
  origin's window across tilesets and views by weight (§13.4) instead of
  first come, first served.
- **Deadlines (EDF):** a tile the camera's motion will reveal has a deadline,
  the time until it is visible; request earliest deadline first. **Aging**
  keeps prefetch and distant tiles from starving under constant churn.
- **Backpressure** (as dirty-page throttling): never fetch faster than the
  decode and upload stages drain. The scheduler holds on upload backlog.
- **Shortest job first** among equal priorities: smaller tiles first
  maximizes coverage per second (sizes are learnable per level).

**Scheduling across tilesets (to try).** Each tileset sorts its own
requests (prefetch already sorts after visible tiles), but the tilesets
on one origin take free slots of the shared window in update order, first
come first served. Seen at Mount Rainier (r25): OSM Buildings' prefetches
filled the `assets.ion.cesium.com` window while Cesium World Terrain's
visible tiles waited. The r25 fixes cut the flood (783 requests to 31),
not the cause; Google 3D Tiles prefetching while terrain is missing would
repeat it. Ideas, with the operating-system analog each comes from:

- **One priority queue per origin** (the I/O scheduler that arbitrates a
  disk among processes): every tileset submits what it wants each frame;
  after all have updated, the origin issues requests from one queue.
  Tilesets and views are the processes, the origin is the disk. Rebuilt
  every frame, as wanted sets change with the camera (1.x re-sorts each
  frame too).
- **Priority classes before priorities** (Linux I/O priority classes,
  `ionice`: realtime, best-effort, idle): needed now (holes in a view),
  refinement, prefetch. Prefetch is the idle class, served only when
  nothing else waits. Within a class, each policy's own key (distance,
  1.x load priority, region group). Classes make tilesets comparable
  where their priority numbers aren't.
- **Preempt in-flight prefetch** (the kernel may drop readahead requests,
  `REQ_RAHEAD`): when the window is full and visible requests wait, cancel
  the lowest-class in-flight requests. A slow prefetch holding a slot
  that a visible tile needs is priority inversion.
- **Priorities on the wire** (the network analog): HTTP/2 and HTTP/3
  carry request priorities (RFC 9218, urgency and incremental), and
  `fetch(url, { priority: "low" })` passes the hint on. In-flight prefetch
  then gets bandwidth only when visible responses don't need it; the
  server can order bytes, which the client can't.
- **Aging** (as in OS schedulers): a request's effective priority rises
  the longer it waits, so prefetch and far tiles still progress while the
  camera keeps moving, and no tileset starves another.
- **Weighted fair sharing** (weighted fair queueing, deficit round robin,
  above): when several tilesets need the same class at once, share the
  window by weight (view importance, screen coverage) instead of by
  update order.
- **Measure**: L1′ with two tilesets on one origin (OSM with terrain;
  Google with terrain): time until each tileset's visible tiles settle,
  and how long visible requests wait behind others' prefetches.

### 13.3 Budget-driven refinement

**Problem.** Under memory pressure 1.x raises one global SSE threshold
(×1.02 per frame), degrading everything uniformly, including the area the
user is looking at.

**Approach.** Benefit/cost selection (Funkhouser–Séquin):

- Benefit of refining a tile = SSE reduction × screen coverage × view
  weight. Cost = bytes + decode time.
- Refine greedily by benefit/cost until the budget is spent. Coarsen the
  lowest-value tiles first when over.
- One engine-wide budget (13.6) arbitrates across tilesets and views.

**Measure.** L1′ image error at a fixed byte budget: lower FLIP than 1.x's
memory-adjusted SSE at the same bytes.

**Product question: whose network?** Throttled L1′ (r22) shows the choice
depends on the link. On fast links skipping levels wins on every metric; on
a 20 Mbit/s, 80 ms link 1.x's level-by-level loading looks better on average
while loading, though it settles later on more bytes. Which default is right
depends on the distribution of our users' bandwidth and latency (desktop on
office networks vs mobile and field use, regions). Get that distribution
(ion CDN logs, or opt-in client telemetry) before tuning defaults; until
then, adapt at runtime from measured throughput (§13.2), and add a 2nd and
10th percentile profile to L1′ once the distribution is known.

### 13.4 Multi-view priority

- Pin a tile while the most demanding view needs it (max over views), and
  order bandwidth by a weighted sum across views.
- **View weights:** a small inset or offscreen thumbnail shouldn't compete
  equally with the main view. Apps set weights; defaults follow pixel area.
- **Cache reuse across views** (in `Budgeted` v1): a view may draw finer content
  another view already loaded. In 1.x, each viewer has its own cache.

**Measure.** The split-view and inset scenarios in the viewer; L1′ with two
views and asymmetric weights.

### 13.5 Visual quality signals beyond geometric error

- **Silhouettes (design models).** iTwin's coarse tiles drop small elements,
  changing the silhouette (the underground CAD case). Refine sooner where
  children carry geometry the parent lacks, using the per-child difference
  in feature count or bounding volume as a cheap proxy. Element-level
  metadata could flag significant elements.
- **GPU coverage feedback.** The depth pyramid (HZB, M5) gives pixels covered
  per tile and occlusion. Occluded tiles (behind buildings) lose priority;
  coverage replaces the bounding-sphere estimate of screen size.
- **Stability.** Hysteresis bands on refine and coarsen, no coarsening while
  a finer sibling is still loading, and dithered cross-fades instead of
  popping.
- **Prediction.** Prefetch along camera velocity and at flight destinations;
  1.x's flight-destination preloading becomes a general velocity prior.

### 13.6 Memory management (open design question)

1.x's static 512 + 512 MiB per tileset is a parity default, not a design.

- **One engine-wide GPU budget** covering tilesets, render targets
  (already capped: 256 MiB idle), materials and textures. The arbiter is
  13.3's benefit/cost, not per-tileset caps.
- **Sizing without a VRAM query** (WebGPU exposes none). Candidates:
  - adaptive signals: allocation failures, frame-time pressure, device loss;
  - platform heuristics (integrated vs discrete GPU from the adapter);
  - an application hint.
    Start conservative and grow while there are no failures.
- **Cheaper residency:**
  - Transcode photogrammetry textures (JPEG → BC7/ASTC) in workers: about 4×
    less GPU memory, at a decode-time cost.
  - Quantized vertex streams.
  - Share textures and materials across tiles where content repeats.
- **Paging lessons:** the tile cache is virtual memory. Measure
  _thrashing_ directly: the rate at which evicted tiles are requested again
  within a few seconds (page-fault frequency). That says the budget is too
  small far better than 1.x's ×1.02 SSE creep. Working-set or ARC-style
  replacement keeps a fast fly-through from flushing tiles the user keeps
  returning to, which plain LRU doesn't.
- **Eviction policy:** what survives eviction (decoded CPU copies,
  compressed bytes, nothing) trades memory against refetch and decode time.
  The HTTP cache already keeps raw bytes.
- **Fragmentation:** the arena allocator is first-fit. Measure churn under
  streaming, and move to TLSF or size classes if it fragments. (r50: size
  classes come with the arena slabs, §13.15; the pools' capacity joins the
  budget there too.)
- **Visibility:** the viewer's memory panel shows every pool against its cap,
  so budget changes are visible in real time.

### 13.7 Structure and formats

- **Traversal off the main thread.** Move the tile tree to a struct-of-arrays
  table that a worker can own (transferable, no SharedArrayBuffer required),
  and run selection there. The main thread receives per-view selections and
  requests.
- **3D Tiles 1.1:** implicit tiling and subtrees, multiple contents per tile,
  and metadata at tileset, group and content level.
- **Formats:** pnts (M6, with the compute point-cloud path), i3dm (instancing
  maps directly onto draw records: one record per instance), cmpt.
- **Edge and planar-fill extensions for CAD** (`EXT_mesh_primitive_edge_visibility`,
  `BENTLEY_materials_planar_fill`, line and point styles), as noted in §11.

### 13.8 Rendering on demand

**1.x.** Renders every frame by default. `requestRenderMode` (opt-in, since
1.42) renders only on camera changes, tile, imagery and terrain loads,
simulation-time changes beyond `maximumRenderTimeChange` (default 0: a
running clock still renders every frame), and explicit
`scene.requestRender()`. It is off by default because 1.x can't see every
change: entity property edits, custom shader uniforms or DOM-driven state
can leave a stale frame unless the app calls `requestRender()`.

**2.0: on demand by default, continuous as an option.** Every scene change
already goes through engine APIs, so the engine tracks invalidation itself
instead of relying on the app:

- **Camera:** a view's camera or rect changed, including controller
  inertia.
- **World mutations:** dirty record ranges, mesh, material and texture
  adds or removes, view-mask and placeholder changes (all already pass
  through `World`).
- **Streaming:** while requests are in flight or uploads are queued,
  selection runs on a cheap tick, and a frame renders only when the
  selection or draw records change. With nothing loading and a still camera
  the engine is idle.
- **Environment:** sun, lighting, exposure, output encoding.
- **Time-driven content:** glTF animation, animated materials, and later the
  clock and globe lighting request frames while active.
- **Resize, picking and readbacks** request one frame each.

Dirtiness is per view: a view whose camera and content are unchanged keeps
last frame's image (insets and split views stop re-rendering). The API is
`engine.renderMode = "onDemand" | "continuous"` (default on demand) plus
`engine.requestRender()` for state outside the engine. Statistics report
idle and frames rendered per second instead of stale frame times.
Benchmarks and parity harnesses call `renderFrame()` directly and are
unaffected. The viewer gets a "Render continuously" toggle. Two states stay separate in the API and the viewer: streaming (tiles
loading vs up to date, `Tileset3D.idle`) and rendering (rendering vs idle);
a scene can be up to date and still render (an animation), or stream while
no frame renders (tiles arriving off screen).

**Implemented (r23).** `engine.renderMode` defaults to `"onDemand"`; each
tick evaluates view links, then renders if `requestRender()` was called, a
pick is pending, or an allocation-free fingerprint of the scene changed (the
sun; per view its target size, viewport, camera, exposure, clear color,
encoding, lighting, world). Otherwise active tilesets (loading, changed in
the last few frames, or with the memory-adjusted SSE still moving) run
selection and uploads, and a frame renders only if a world's version moved
(`World.version`, bumped by every record and material change). The viewer
renders 16 to 19 frames per second while Midtown streams, none once it
settles, a frame per camera change while orbiting, and serves picks while
idle.

_r37_: hovering rendered frames. `GlobeController` picks the position
under the cursor on every pointer move (one pick at a time, so wheel zoom
can aim at what's under the cursor), and a pick was served by a pass in a
rendered frame, so the viewer rendered about as often as the pointer
moved. **Fixed**: each view keeps its own feature-ID and depth targets
(not pooled; depth is stored every frame), and a pick for a view that
doesn't render this tick runs only the pick pass on what its last frame
left there. Hovering the milk truck: 60 pointer moves, no frames rendered
(30 pick-only submits); wheel zoom still lands on the hovered point.
The cost is those two MSAA targets per view, no longer shared between
views of one size through the pool.

Per-view dirtiness: each view keeps its own fingerprint, and `World`
accumulates the view-mask bits of every record it changes (a changed mask
contributes its old and new bits; a material change, every view), so a tile
selected or uploaded for one view doesn't redraw another, and content
uploaded hidden redraws nothing. Rendering is per target: a canvas gets a
fresh texture each frame, so a target redraws all its views when any of them
changed, and targets with nothing changed are skipped and keep their last
image. With two canvases, moving one camera ten times rendered ten frames
into its canvas and none into the other. Most applications are expected
to give each view or UI component its own canvas, all driven by one engine
over a shared scene; that case is complete.

**Independent views within one canvas (r23).** Views sharing a canvas
(the viewer's split view and inset) are composited on demand: each view
presents into its own persistent image at its size, only dirty views (or
ones without a current image, e.g. after a continuous frame) re-render,
and every frame that touches the canvas clears it and copies the views'
images in view order, so an inset lands over the view it overlaps. A
clean view costs one copy. Single-view canvases, `renderFrame()` and
continuous mode draw straight into the target with no extra memory. In
the viewer's split view, moving one camera ten times rendered that view
ten times and the other none. Cost: one image per view on a shared canvas
(not yet counted in the render-target budget, §13.6).

**Measure.** Frames rendered while idle (zero), time from a change to its
frame (one frame), and no stale frames in the parity harnesses' interactive
counterparts.

### 13.9 Transforms and instancing

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
  - _The binding budget_ (§13.15): style kernels get a fixed slot (one
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
  Designed in §13.15 as slabs (r50).
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

### 13.10 Ray queries, ray tracing and path tracing

**Height and pick queries.** Terrain answers on the CPU: it is a height
field and each tile keeps its drawn triangles, so the triangle under a
point is a direct lookup, synchronous and exact against the drawn surface.
3D Tiles keep no CPU geometry (1.x keeps it with `enablePick` or reads it
back), so their queries run on the GPU behind one batched, asynchronous
API: rays in float64 in, hits out (distance, point, normal, draw, feature).

1. _Raster probes (M3, clamping)._ Tiny views along each ray, depth and
   feature ID read back. They reuse culling, view masks and level of
   detail, and handle point clouds. 1.x's `Scene.sampleHeight` works the
   same way.
2. _Compute ray tracing (later)._ A BVH per mesh (BLAS), built in the
   worker at decode, and a top-level BVH (TLAS) over the transform and
   instance tables, rebuilt per frame (it covers draws, so it is cheap).
   Exact nearest hits for any batch of rays.

Rays and targets across frames of the frame tree, such as the Moon in MOON_ME, moving bodies and design-space models, are plan 5 (§13.14, "Ray queries through the frame tree"). Where queries run and when acceleration structures are built is §13.16.

**Path tracing grows out of (2).** The architecture suits it: all geometry
is in one arena read by index from storage buffers, and materials, draw
records, transforms and instances are tables, so one compute shader can
fetch any triangle and its material. Gaps: WebGPU has no hardware ray
tracing (traversal is software, as in three-gpu-pathtracer: fine for
progressive or offline images, not real time at Google 3D Tiles scale; a
native Slang backend could use hardware ray queries); no bindless textures
(texture sets would move into arrays or atlases, as imagery already is,
§7.1); float32 (the TLAS is camera-relative with hi/lo origins, as the
rasterizer is); streaming (BLAS once per tile, TLAS per frame).

### 13.11 Real-time tracks: thousands of moving, clamped entities

**Use case.** Defense and operations customers show live unit positions
from a network feed or database as custom symbology (usually billboards,
sometimes models or decals), clamped to terrain and 3D Tiles, updated
fluidly. 1.x does this with entities and billboard collections, re-clamping
each one on the CPU.

**What exists (r31).** Clamped models with event-driven re-clamping (one
`setTransform` per move), GPU ray casts for 3D Tiles heights batched over
all anchors, per-instance updates without allocation (100,000 instances:
1.8 ms CPU to move 1% per frame, 101 ms to move all), and scatter uploads.

**Design.**

- _Tracks as instance data, not objects:_ a track collection is one
  record (a billboard set or an instanced model) with per-instance streams
  (position as longitude, latitude and height or Earth-fixed hi/lo,
  heading, symbol, color, flags). A feed update writes a typed-array slice
  (bulk update API) that uploads as a scatter; no per-entity JavaScript
  object or call on the hot path, and decoding of the feed can run in a
  worker.
- _Clamping on the GPU:_ a compute pass gives each instance its ground
  height every frame, from the terrain tiles drawn (their heights uploaded
  as a texture array or read from the arena) and from 3D Tiles by ray
  casts against the views' draws; the instance matrix is built on the GPU.
  Moving anchors then cost nothing on the CPU, and many-entity clamping
  scales with the GPU.
- _Smooth motion:_ interpolation (or extrapolation) between feed samples
  in the shader from two timestamped positions per track, so 1-10 Hz
  feeds animate at frame rate.
- _Symbology:_ billboards by point expansion (§13.9) with programmable
  shading (custom shading, §3.4) for military symbols (MIL-STD-2525 /
  APP-6 style) from per-instance attributes; decals for areas; labels
  with GPU decluttering.
- _Picking and selection per track_ through per-instance feature IDs.
- _Model up close, symbol from afar (r47):_ each track is an instance in
  two draws, an instanced model (e.g. 1.x's Cesium Milk Truck, oriented
  by heading) and a billboard set with its symbol. The cull pass, which
  already visits every instance on the GPU, picks one per instance and
  view by the track's projected size, writing it into that draw's list,
  with hysteresis and a short crossfade so tracks at the threshold don't
  flicker; no CPU work, so it scales with the track count. Billboards
  clamp with the same GPU clamping, with a depth policy like 1.x's
  `disableDepthTestDistance` (symbols behind a ridge visible when
  wanted). Symbols are drawn once into an atlas (e.g. milsymbol to a
  canvas), chosen and colored per instance by custom shading.
- _Before the milestone (done, r47):_ custom shaders read per-instance
  streams by name (`vsInput.instance.<name>`, Custom shading increment
  9), and `World.setInstanceStreams` rewrites many instances in one
  copy.
- _The showcase:_ the first showcase example (§13.12), in the gallery as
  an Examples section of Dyno (one engine and canvas, deep links), its
  module following the `run(context)` contract so it can move to
  Sandcastle or get a standalone page.

**Measure** (benchmark suite v1, §16.4 group C; instanced models until
billboards exist): 10,000 and 100,000 tracks updated at 1 Hz and 10 Hz
from a synthetic feed over terrain and over Google 3D Tiles: CPU per
frame, GPU per frame, update-to-display latency, clamping error, frame
time stability; against 1.x entities and billboard collections.

**When.** The measurement belongs in benchmark suite v1. The feature needs
billboards and custom shading for symbology, so it follows the "Custom
shading" milestone ("Real-time tracks" milestone), unless its priority
moves it earlier.

### 13.12 Examples and the gallery

Three kinds of pages, kept apart:

- **The viewer** (`viewer/`): the development and debugging tool (content
  tabs, stats, selection policy, parity toggles). Not an example.
- **Harnesses** (`parity/`, `bench/`, `spikes/`): test pages the runner
  drives, listed in the viewer's panel.
- **Examples**: what users and stakeholders see, one per feature or use
  case (real-time tracks, very large CAD, splats, multi-view, clamping,
  custom shading).

**One gallery page that swaps examples, not a page per example.** Each
example is a module under `examples/<slug>/` exporting its metadata
(title, description, labels such as "3D Tiles" or "Defense", required
tokens) and `run(context)`, which builds its scene in a world and returns
a disposer. The gallery keeps one engine and canvas, lists examples with
search and labels, switches with `?example=<slug>` (deep links, back
button) without reloading, and shows each example's source. Switching
exercises content in and out of a live world, which the engine is built
for (r27). Kept small and self-contained in the PoC; eventually the
gallery is Sandcastle (`packages/sandcastle`), so example modules follow a
shape Sandcastle can host (editable source, sharing, gallery metadata).
Built in Dyno (r47, Real-time tracks increment 4) with the real-time
tracks example; not yet: search and labels as filters, editing the
source.

**The Slang playground (r50).** A second example: a live shader editor
beside a viewer. Edit Slang custom shader stages (`import cesium;`,
`vertexMain` and `fragmentMain` against the user contract, §3.4) and see
them on content as you type.

- _Why now._ It is the first user-facing use of runtime Slang
  (`CustomShader.fromSlang`: the WebAssembly build in a worker). It is
  where the Slang-first migration's open questions show (§3.4): the WASM
  build's size and compile latency are measured on every edit, in the
  page.
- _How it works._
  - An editor with presets (bands by height, a pulse in time, toon steps,
    normals, a vertex twist).
  - It compiles after a short pause in typing and keeps the last shader
    that compiled. A compile error shows with its line and leaves the
    content drawing the last good shader.
  - The status line shows the compile time and the WGSL's size; the
    generated WGSL can be shown.
  - Targets are the repository's sample glTF models, placed on the
    terrain, with tilesets later.
  - A new shader re-places the model with it: the asset's upload is
    cached per world, so that costs only draws. A live swap
    (`World.setDrawShader`, moving draws between batches) is the next step
    if tilesets need it.
- _Setup._ The WASM build (10 MB, pinned with slangc in
  `scripts/slangTools.mjs` and checked against the release's SHA-256) is
  fetched by `npm run setup` into `~/.cesium-bench/slang-wasm`. The dev
  server serves it at `/slang-wasm/` without `SLANG_WASM_DIR`. Without it
  the example says how to get it.
- _The lookdev stage (r51)._ The example takes the gallery's side layout
  (`layout: "side"`: the view and the panel side by side, not an overlay)
  and starts with the globe off.
  - _Camera._ Orbit controls (`viewer.setControls("orbit")`: an
    `InspectController` around the model, the globe controller disabled)
    and a Focus button that frames the model.
  - _Stage._ Globe (off, ellipsoid, terrain); background colors; a
    procedural environment light (studio, sunset, overcast, dark) or the
    atmosphere; the sun (key, soft, off, time of day); a turntable.
  - _Models._ Procedural shapes, the repository's samples, a few Khronos
    samples by URL, any CORS-enabled glTF URL, and a local `.glb`.
  - _Presets._ 24, in groups (light and view, patterns, noise, materials,
    vertices), sharing noise and hue helpers.
  - Settings and the source persist in `localStorage`.
- _The editor (r51)._ CodeMirror 6, as Shadertoy uses (version 5 there).
  - _Highlighting._ The C-like stream mode, extended with Slang's keywords,
    the HLSL-style types and the contract's types.
  - _The Slang language server._ The WebAssembly build's `LanguageServer`
    runs in its own worker: diagnostics as you type, completion,
    signature help, hover and go to definition (Cmd/Ctrl-click, F12).
    Documents live in the build's file system too (`/user.slang`), and
    edits arrive as `didChangeTextDocument`. This is how Slang's own
    playground drives it: without the file there are no diagnostics or
    completions.
  - _Hover._ As in VS Code: the signature, highlighted, and its doc
    comment. The server's "Defined in user.slang(4)" is replaced by go to
    definition. Symbols from the contract say so, with a link into the
    Contract reference.
  - _The Contract reference._ The `cesium` module as the user's shader
    imports it, read-only and highlighted. This is Shadertoy's "Shader
    Inputs" panel, for a module. Go to definition opens it at the line.
  - Compile errors from `slangc` show as diagnostics too, where the server
    found none.
- _No globe flash._ `Viewer.suspendPresentation()` keeps the canvas from
  presenting while a caller sets a scene up.
  - It is ref-counted and returns a disposable resume function.
    `ViewerOptions.suspendPresentation` suspends from creation;
    `resumePresentation()` ends that suspension and
    `suspendPresentationUntil(promise)` ties one to a promise.
  - The container carries `data-cesium-presentation-suspended`, so an
    application can draw its own loading screen.
  - The practice is the same as Android's `postponeEnterTransition` and
    Unity's `allowSceneActivation`: the caller says when the first frame
    is ready, and the engine holds that frame until then.
  - The gallery creates its viewer suspended and resumes after each
    example's setup. Its spinner is centered on the view.
  - `suspendPresentation({ hide: true })` hides the canvas instead of
    keeping its last frame. Use it for new content; keep the last frame
    for an edit of the scene in view. The canvas shows again only once a
    new frame is drawn, otherwise it would present the stale frame once.
    The gallery hides on every switch, in a layout effect, so the old
    example never paints under the new one's title (r52).
- _Lookdev only (r52)._ The stage has no globe, timeline or credits. The
  key light is the sun, set by direction at the stage (`setSun`: key, soft
  key, top, back, off), and `Viewer.creditsShown` hides the credits while
  no attributed data is in view. The example restores all three when it's
  left.
- _Errors where they're seen (r52)._ Compile errors appear in a list under
  the editor, each a link to its line, with a lint gutter. Model errors
  appear as a banner over the view that says what failed to load and why.
  A failed model returns the selection to what is shown, so recompiles
  don't retry it. Compile errors are kept against the text that was
  compiled, so an edit never leaves a stale mark.
- _Fixed on the way (r52)._
  - **Re-placing a model lost its textures.** `addModel` closes an
    asset's decoded images after upload, and removing its last placement
    frees the upload. Placing the same parsed asset again uploaded from
    closed, 0×0 images, and WebGPU rejected the infinite mip count. The
    engine now says so, naming the fix. The playground adds the new
    placement before removing the old one.
  - **Turning the globe off drew black frames.** `SlicePool.release`
    destroyed the imagery array while the world's bind group still named
    it, so every submit failed. It now unbinds the array (the placeholder
    again) first (test/slicePool.test.ts).
- _Three design problems these bugs showed, addressed (r53)._
  - **Asset ownership: explicit handles.**
    - `engine.loadModel(world, url)` and `engine.uploadModel(world, asset)`
      return a `ModelResource` the caller owns. `model.place(options)` is
      the only way to place, returning a `ModelPlacement` (was
      `ModelInstance`).
    - A model is freed once its handle is released and no placements
      remain, so removing placements never frees a model still held. A
      one-off is `using model = …; model.place(…)`, and the placement keeps
      it until removed.
    - Source data (decoded images) is released at upload unless
      `releaseSourceData: false` (Filament's `releaseSourceData()`, Unity's
      `markNoLongerReadable`). Uploading a released asset again throws,
      saying why. The handle keeps only what placing needs (node matrices,
      lights, feature tables), not the geometry. Bevy's `Handle<T>` and
      Filament's `FilamentAsset` are the precedents.
    - Placements are bound to their model's world, so a mismatched world
      can't be expressed:
      - `setTransform`, `setVisible`, `setInstance` (GPU instances; was
        `engine.setModelInstance`);
      - `setShader`, a live swap through `World.setDrawShader` (the draws
        move between batches, nothing is placed again; the playground's
        edits use it);
      - `remove()`, idempotent; use after removal throws.
        Both models and placements are `Disposable`.
    - Each option lives with what it describes. `colorTransfer` and `axes`
      moved to the model. Placements take `modelMatrix | at` and
      `parent | heightReference` as discriminated unions. `collision` and
      `underlay` are engine-internal.
    - One source of truth per fact: `bounds()` follows the live transform
      (the `center` and `radius` fields are gone), `bytes` is the model's,
      and `draws` and `lights` are read-only.
    - Leaks are visible. A `FinalizationRegistry` warns when a handle is
      garbage-collected unreleased (unless its world was destroyed), and
      the inspector's memory section lists models, held handles and leaks.
    - Tiles upload, place and release, keeping the source data until the
      placement succeeds so a capacity failure still retries. Vector layers
      share one upload per model across their pools.
  - **Fault isolation: errors reported, damage contained.**
    - `engine.errors` and `engine.onError` replace console-only errors.
      Kinds are shader, pipeline, resource, frame and device, each distinct
      message kept once with a count. The inspector's Problems section
      shows them.
    - A custom shader or pipeline that fails already drew with the
      engine's: it's reported now.
    - The engine's device records each texture it destroys and each view's
      texture (`gpu/textureTracking.ts`, instance properties on its own
      objects, nothing global). A texture set binding a destroyed texture
      has its batches skipped, and an imagery array destroyed while bound
      is unbound. Either way the bad resource costs its draws, not the
      frame.
    - Each frame's submit runs in an error scope. A rejected frame is
      reported (`stats.rejectedFrames`) and every world binds again from
      its state (`World.rebind`).
    - The tracking caught a real ordering slip at once: growing the imagery
      array destroyed the old texture before binding the new one. Fixed,
      with a test.
  - **Gallery isolation: a viewer per example on one engine.**
    - The gallery keeps one `Engine` (device, pipelines, workers). Each
      example gets a fresh `Viewer` on it, `Viewer.create({ engine })`,
      destroyed when the example is left: its world goes with everything in
      it (`Engine.removeWorld` now removes the world's tilesets and views
      too).
    - A borrowed engine is never destroyed by the viewer, and a new viewer
      resets the engine-wide settings it relies on (the sky; the sun and
      render mode it sets anyway). `Engine.start` is idempotent.
      `ExampleContext.scope` (a `DisposableStack`) is disposed after the
      example's undo.
    - The playground's restore code is gone.
    - Sandcastle can work the same way: one engine per page, a viewer per
      run.
    - **Switching between examples (r53).** The example page's back link is
      now a switcher in the same space: "Examples / this one ▾ ‹ ›".
      - The menu lists every example with a picture of it, captured from
        its own canvas a moment after it starts (a frame rendered and read
        in one task, kept as a small JPEG in `localStorage`). Initials stand
        in until an example has run.
      - ‹ › and the `[` / `]` keys step through the examples (not while
        typing in a field or the editor).
      - Each example is a fresh viewer on the shared engine, so a switch
        costs only the example's own setup.
    - **The gallery page (r53)** is a grid of picture tiles. Each tile shows
      the example's captured thumbnail at 480×270 (a gradient with its
      initials until it has run), its title, two lines of description and
      its labels, and the whole tile is the link.
- _Declared uniforms as controls (r53)._ Slang's user-defined attributes,
  not a comment syntax: `cesium.slang` declares `Slider(default, min,
max)`, `Color(r, g, b)` (linear RGB), `Toggle(on)` and `Label("…")`. A
  shader writes `[Slider(4, 1, 8)] [Label("Steps")] uniform int steps;` and
  uses `steps` by name.
  - **Compile flow** (`slang.ts`, `slangControls.ts`):
    1. A reflection pass links the user module alone. Its JSON gives each
       global's type and its attributes with their arguments, so the
       declarations are checked by the compiler.
    2. Each declared uniform becomes a field of the shader's uniform
       buffer. Its declaration is blanked, and each use of its name is
       rewritten to the field (`uniforms.steps`; a `bool`, stored as a
       `u32`, as `!= 0u`). The rewrite works on identifier tokens outside
       comments and strings, and leaves names after a `.` alone, so a
       parameter named `roughness` doesn't touch `material.roughness`. A
       local that shadows a parameter is an error that says so. Lines keep
       their numbers in errors. (A first version used `#define`, which
       rewrote member accesses too.)
    3. The real compile follows.
       Supported types are float, int, uint, bool and float2-4, one
       declaration per line.
  - **Labels come from names** unless `Label` gives one (`linesPerUnit`
    reads "Lines per unit"). Slider steps are a power of ten about a
    hundredth of the range, so written defaults land on a step.
  - **`CustomShader.controls`** describes each one: name, label, kind
    (slider, color, toggle, number), type, default and range. A host sets
    them with `setUniform`, no recompile.
  - **The playground's Parameters panel** floats over the view's bottom
    left, collapsible (the state kept), so values are tuned while watching
    the model. It builds sliders, color pickers, toggles and number fields
    from them. Values are kept by name across
    compiles and visits until the shader changes that uniform's type or
    default, and Reset restores the defaults. Every preset where it makes
    sense has parameters (all but Normals), written one compact line each:
    `[Slider(1.5, 0.5, 6)] uniform float falloff;`.
- _Playground details (r53)._
  - **New:** starts a minimal shader, the model's own material, with the
    contract's inputs described. It is one undoable edit.
  - **Stage detection** (`slangStages`) now looks for definitions outside
    comments. A template comment naming `vertexMain` had made the compile
    wrapper call a stage that didn't exist.
  - **Layout:** the side layout is two rounded cards with a gap (no border
    line between the view and the panel), and the Preset and Model rows
    share one label and control grid.
- _Later._
  - Sharing a shader by URL (the source compressed in the hash), with its
    parameter values; and a `Choice` control (a labeled dropdown) beside
    `Slider`, `Color`, `Toggle` and `Label`.
  - **Displacement padding from the controls:** a large Spikes height
    pushes geometry past its bounds and parts are culled at the view's
    edges. A shader's `displacement` (which pads culling bounds) could
    follow its sliders' ranges.
  - **Fault isolation's remaining gap:** custom shaders' own textures
    (texture uniforms) aren't covered by the destroyed-texture tracking.
  - **Live style changes for tilesets** through `setShader` (a draw's
    shader swapped in place), instead of placing the tiles again.
  - **Checked-in thumbnails, generated by a script.** Captured thumbnails
    live in each browser's storage, so a first visit (and Sandcastle) sees
    placeholders.
    - A script (`npm run thumbnails`, a headless browser on the dev
      server) would open each example, wait for it to settle, and save
      `examples/<id>/thumbnail.jpg` at 480×270.
    - The gallery would show the checked-in picture unless this browser
      has a newer capture of its own.
    - Run it when an example changes, or check in CI that every example
      has one.
  - Tilesets with metadata (`fsInput.metadata`).
  - **A boundary-representation (B-rep) drawing example**: CAD solids
    drawn from their faces, edges and vertices, after vector drawing is
    generalized (lines and their styles beyond points), since it will
    want that drawing code for its edges and silhouettes. The geometry
    side: NVIDIA's open-sourced USD BRep
    (github.com/NVIDIA-Omniverse/usd-brep, Apache 2.0), which includes
    SMLib, a NURBS B-rep kernel (booleans, fillets, intersections,
    healing) with OpenUSD interop, in C++ and Python. To work out: how
    to use it from the engine, e.g. built to WebAssembly in a worker
    (tessellating faces and edges at the view's tolerance), or offline,
    converting B-rep to tiles with exact edges, and what it costs in
    size.
  - The same editor for vector styles (§13.9).
  - Exact highlighting from the server's semantic tokens, instead of the
    stream mode.
  - Readiness signals: resume presentation automatically once the content
    in view settles (tiles loaded, shaders compiled), so callers needn't
    say when.

**Pages without a build step (r39).** `npm run build:lib` writes
`dist-lib/`: one ES module (`cesium-next.mjs`, WGSL inlined), the content
worker and the Draco and Basis wasm under `assets/` (each located from its
importer's `import.meta.url`), and declarations under `types/`. A static
page (Sandcastle-style, no bundler, no TypeScript) imports it with a module
script. From another origin (a CDN) the files need CORS, and the worker
starts through a same-origin `blob:` module that imports the real script,
since browsers start workers only from the page's origin (`WorkerPool`);
`standalone/index.html` is the check, tested with the page and the library
on different origins (workers, wasm and KTX2 transcoding included). Not
yet: a classic-script (global) build, publishing, or a stable public API
surface; `exports` still points at the source for the workspace.

How cross-origin loading works, step by step:

1. **No base URL.** Every file the library loads is located from the
   module that loads it, fixed at build time: the worker from
   `cesium-next.mjs` (`?worker&url`), the wasm from the worker, each as
   `new URL(file, import.meta.url)`. Wherever the files are served, the
   URLs follow; there is no `CESIUM_BASE_URL` to set and no folders to
   copy.
2. **The module.** `import()` or `<script type="module">` of another
   origin needs `Access-Control-Allow-Origin` on the response (module
   scripts are always fetched in CORS mode). npm CDNs (jsDelivr, unpkg)
   send it.
3. **The worker.** `new Worker(url)` must be same-origin, CORS or not.
   `WorkerPool` compares the worker URL's origin with the page's: the
   same, it starts the worker directly; different, it starts a module
   worker from a `blob:` URL (same-origin by construction) whose only line
   is `import "<worker url>";`. The import is a cross-origin module fetch
   (CORS again). Inside, `import.meta.url` is the real CDN URL, so the
   worker's own chunks and wasm resolve against the CDN, not the blob. One
   blob URL per page, made on first use and kept.
4. **Wasm and data.** The worker `fetch`es its wasm (CORS) and content
   (whatever the content server allows, as in 1.x). The worker's origin is
   the page's, so content requests carry the page's origin.
5. **Not covered:** `file://` pages (browsers load no modules or workers
   there; the page says so). A consumer's own bundler re-bundling
   `dist-lib` is untested: bundlers that follow `new URL(…,
import.meta.url)` (Vite, webpack 5) should copy the worker, but the
   worker's wasm is referenced only from inside it.

**Content Security Policy** (with CesiumJS PR #13669, open, which moves
1.x's WebAssembly into workers and adds a CSP guide): 2.0 already runs all
WebAssembly (Draco, meshopt, Basis) in its workers; the page bundle has no
WebAssembly and no `eval`. Tested with the guide's split policy, the page
served `script-src 'self'` (plus `'unsafe-inline'` for the example's own
inline script) and the same-origin worker response `script-src 'self'
'wasm-unsafe-eval'`: everything loads (Draco, Basis KTX2), and the page
itself can neither compile WebAssembly nor evaluate strings. Fixed on the
way:

- **glTF `data:` URIs** were `fetch`ed in the worker, which `connect-src`
  checks (blocked under `'self'`); they are decoded in place now, as 1.x
  does.
- **Basis needed `'unsafe-eval'`.** The vendored transcoder glue (1.x's
  Emscripten build) generates functions from strings in four places of its
  embind runtime (`createNamedFunction`, `craftInvokerFunction`,
  `craftEmvalAllocator`, `__emval_get_method_caller`), and 2.0 evaluated
  the UMD script itself with `new Function`. `basisTranscoderEsm.ts` (a
  Vite plugin, `…/basis_transcoder.js?basis-esm`) now rewrites the glue at
  build time into an ES module with each generator replaced by the closure
  Emscripten emits under `-s DYNAMIC_EXECUTION=0`; every patch must match
  once or the build fails. Transcoding is unchanged: the 7 KTX2 samples in
  `Specs/Data` into RGBA8, BC7, ASTC and ETC2, every level (72 outcomes),
  are identical to the original glue's; model parity is identical. The
  output carries a notice of the change (Apache-2.0 §4(b): Basis Universal
  is Apache-2.0, Emscripten's runtime MIT), and the library build ships
  the repository's `LICENSE.md` with its third-party notices. The
  alternative, rebuilding the transcoder with Emscripten, stays open if the
  glue is ever updated.

Still open:

- **Strict separation needs same-origin workers.** A worker started from a
  `blob:` URL (the cross-origin path) takes the page's policy, so the page
  must allow `blob:` and the CDN in `worker-src` and `script-src`, and
  `'wasm-unsafe-eval'` itself; a policy on the CDN's worker response can't
  narrow it. As in 1.x. To let an application load the library from a CDN
  yet keep WebAssembly out of its page, `Engine.create` could take the
  worker's URL (served by the application, the guide's
  `workerModuleUrl`).

1.x already starts cross-origin workers through the same blob shim
(`TaskProcessor.createWorker`); what differs is step 1: 1.x finds workers,
wasm and assets from `CESIUM_BASE_URL` (`buildModuleUrl`), which pages and
bundler setups must set and populate by copying `Workers/`, `Assets/`,
`ThirdParty/` and `Widgets/` (follow-up 14).

Slugs name the use case, not the API (`real-time-tracks`,
`offshore-platform`, `campus-splats`). Example scenes are written so the
benchmark suite (§16) can load the same scene definitions, so a showcase
and its measurement never drift apart.

The gallery skeleton comes with the first example beyond the viewer
(likely with benchmark suite v1 or real-time tracks).

### 13.13 Time and its controls

Once the sky, the sun's light and the stars come from the time, views need
time controls. 1.x's are the `Animation` widget (a shuttle-ring dial for
play, reverse and speed) and the `Timeline` (a scrubbable bar of dense tick
labels in UTC). They show the clock, not what the time means: no time
zone, no sunrise or sunset, no "now", no quick way to pick a date, and a
speed dial few users understand. The model under them (one `Clock` per
viewer: current time, multiplier, range, step) is sound and stays,
improved.

**Model (engine).**

- A `Clock` holds the time (a `JulianDate`, TAI inside), a rate (seconds of
  scene time per second), a mode (paused, playing, or live: following the
  wall clock), and an optional range (clamp or loop). Views refer to a
  clock, shared by default; a view can have its own (split view comparing
  9 am and 3 pm shadows, an AEC staple).
- What depends on time is computed per view from its clock: the sun and
  moon directions (L0 parity with 1.x), the star field's rotation, the
  atmosphere's light and the environment lighting, time-dynamic content
  (§13.11 tracks, time-dynamic tiles). `Engine.sunDirection` becomes a
  derived, per-view value; setting the sun by hand stays possible (an
  override, as the Viewer's sliders do today).
- Changing the time renders on demand like any other change (§13.8);
  scrubbing must stay smooth, so what time rebuilds per frame (the
  atmosphere's sky-view table, the environment's radiance and SH) has to
  fit in a frame.

**Controls (a widget, separate from the engine).**

- **A time pill** in a corner of the view: the date and time at the place
  being looked at, in its time zone ("Tue 21 Jun 2026 · 3:42 pm EDT"), with
  play/pause. `Intl.DateTimeFormat` formats any IANA zone; finding the zone
  of a place needs a small boundary table (or solar time as a fallback).
  UTC and the viewer's own zone are a menu choice.
- **Expanded: a day strip.** A 24-hour scrubber for the chosen day whose
  background is the day itself: the atmosphere's horizon color over the day
  at the focus point (night, twilight, day), with marks for sunrise, solar
  noon, sunset and the twilights, and "now". Dragging scrubs; scrolling over
  it zooms the scale from minutes to years (the timeline's job, when it's
  needed).
- **Date**: a calendar with the year's landmarks (solstices, equinoxes) and
  presets for shadow studies (21 Mar, 21 Jun, 21 Sep, 21 Dec at 9 am, noon
  and 3 pm) and for looks (sunrise, golden hour, noon, sunset, night).
- **Speed** as a few named steps (real time, 1 min/s, 1 h/s, 1 day/s),
  reverse in a menu, instead of a dial. **Now** returns to live.
- **Data time**: when content carries time (tracks, CZML, time-dynamic
  tiles), the scrubber shows its availability as bands and its range, which
  is what 1.x's timeline is for; without such content the day strip is the
  default.
- **Exposure across day and night**: a fixed EV100 15 turns a scrubbed night
  black, so scrubbing past sunset offers (or turns on) automatic exposure,
  and the stars, moon and city lights appear as they would to a camera.
- Keyboard first (space to play, arrow keys to step an hour or a day),
  screen-reader announcements of the time, and a compact form that fits a
  phone. Built framework-free in `widgets/` like the Viewer, with Dyno's
  StrataKit version on top.

**Built (r41).** `Clock` (`src/time/Clock.ts`: time in UTC milliseconds,
rate, paused / playing / live) and the sun from it (`src/time/sun.ts`:
Meeus's low-precision apparent position, about 0.01°, turned to Earth-fixed
axes by Greenwich sidereal time; sunrise, solar noon and sunset by
bisection; unit tests against the almanac: the solstice's and equinox's
declinations, the subsolar longitude by the equation of time, Philadelphia's
sunrise, noon and sunset within 1.5-3 minutes). The `Viewer` owns a clock
and its sun follows it (`viewer.clock`, `sunFromClock`; `setSun` still
places it by hand); the first framing sets an unset clock to 10:30 local
solar time today there, a first look in daylight. The time controls
(`widgets/timeControls.ts`, framework-free, on by default in the `Viewer`):
the pill (date and time, play/pause), and its panel with the day strip
(shaded by the sun's elevation at the place, sunrise and sunset marked, the
wall clock's "now", dragged to scrub, a keyboard slider), the day before and
after, a date, "Now" (live), presets for the light (sunrise, golden hour,
noon, sunset, night) and the study dates (equinoxes, solstices), named
speeds, and the time zone: local solar time at the place (default), UTC or
this computer's. When the sun is down it offers an action (Dyno's: turn on
automatic exposure). Dyno's Viewer: "Sun from date and time" (on by
default; the azimuth and elevation sliders otherwise). Playing at 1 h/s
re-renders every frame with the sky, environment and aerial perspective
updating (about 6 ms of GPU at Dyno's size on the laptop GPU).

Follow-ups: the sun with 1.x's exact algorithms (Simon 1994, the IAU 2006
Earth orientation with its data) for L0 parity; a place's legal time zone
(a boundary table); clocks per view (comparing two times side by side) and
`Engine.sunDirection` per view; data time ranges on the strip; the moon and
the night sky, without which a night is black at any exposure. Open
(r41): with automatic exposure, a midnight view showed the terrain lit
while the truck was black, and at noon the meter settled on an exposure
that clipped the lit truck to white, as if the terrain were far darker than
the sun should make it: the terrain's lighting (or the meter's reading of
it) needs a look. Found on the way: an overflow to infinity (a lit scene
at a night exposure) made the meter's average NaN and froze automatic
exposure for good; the opaque pass now stays below fp16's largest value and
the meter ignores readings that aren't numbers.

### 13.14 Bodies, frames and engineering coordinates

Everything today is in Earth-fixed coordinates (ECEF): the globe, tiles,
the camera and the atmosphere. Two kinds of users want more: space
customers (other bodies, and moving between them) and designers (models in
their own coordinate systems, which are not the Earth's).

**Other bodies.**

- **The moon from its tileset.** Seen from the Earth, the moon can be the
  Cesium Moon terrain tileset placed at its ephemeris position (384,000 km
  away, a handful of root tiles by screen-space error), lit by the sun with
  a regolith BRDF (Lommel-Seeliger or Hapke: the full moon's flat look and
  opposition surge, which Lambert gets wrong) plus earthshine, and seen
  through the atmosphere (transmittance and the sky's radiance in front).
  Its phase, libration and eclipses come out right with no special case.
- **Views on any body without a reload.** Each body has its own fixed frame
  (the Earth's ITRF, the Moon's principal-axis frame, Mars' IAU frame), and
  content belongs to a body. A view's camera is expressed in one body's
  frame; per frame, each body's frame is placed relative to it from the
  ephemerides at the view's time, composed in float64 on the CPU (as the
  transform table already composes placements), then rendered
  camera-relative. Moving a view from the Earth to the Moon changes a root
  transform, not the scene, and different views of one world can be on
  different bodies (one view in Houston, one at the lunar south pole).
- **The gotchas**: time scales (UTC, TT, TDB) and Earth orientation
  parameters; light time (the moon is seen where it was 1.3 s ago, about a
  kilometer of motion, visible at close range) and aberration; per-body
  ellipsoids, terrain, heights and atmospheres (Mars has one, the Moon has
  none); globe controllers per body (up, minimum height, hand-off between
  bodies at a sphere of influence during a flight); one tile cache and
  budget across bodies; picks that return the body and body-fixed
  coordinates; and float32 nowhere near an absolute position (hi/lo and
  camera-relative everywhere, as now). Ephemerides: analytic series to
  start (1.x's Simon 1994 and its moon theory), JPL DE440 for precision.
- **A demo**: fly from a city on the Earth to the Apollo 11 site, the
  Earth's tiles and the Moon's streaming together, the atmosphere's limb
  thinning to black, stars and the Earth in the lunar sky, on the real date
  with the real phase. It exercises every part of this section.

**Engineering coordinates.** Design models are authored in projected
systems (state plane, UTM) or local site grids, often treated as flat over
long distances, with heights in a local vertical datum. One rigid placement
(an iModel's `ecefLocation`) is exact at its origin and wrong away from it:
over a 50 km highway the Earth's curvature drops about 196 m (d²/2R), and
the projection's scale varies by up to 1:10,000 (5 m over 50 km). So:

- **Placement**: reproject vertices through the model's real coordinate
  system when tiles are made (exact in ECEF), or at least place each tile
  rigidly from a tangent frame at its own center (error bounded by the tile
  size); nonlinear warping in a shader is the last resort.
- **Measurement in the design's terms**: the engine keeps each model's
  engineering frame (its CRS and datum, from the source or tileset
  metadata) and its inverse, so picks return both ECEF and design
  coordinates, and measurement tools show grid distance, station and offset
  along an alignment, and elevation in the project datum next to the true
  (geodesic) values, with the combined scale factor that relates them.
  PROJ (MIT) compiled to WebAssembly does the exact transforms on demand.
  Carrying a CRS in 3D Tiles (tileset metadata, or an extension) would be a
  proposal to the 3D Tiles community.

Bodies and engineering frames are one concept: a tree of frames (ICRF to a
body's fixed frame to a model's engineering frame), rigid transforms in
float64 along it, with the nonlinear ones (map projections) at the edges,
resolved when tiles are made or when a point is measured.

**Typed frames in the API (noted r53, with the model ownership API).** Today
every matrix and position is a bare `Float64Array`. Precision is safe:
float64 throughout, hi/lo and camera-relative on the GPU (§13.15). What the
type doesn't say is which frame a value is in, and the frame tree above
will multiply the frames in play:

- ICRF;
- each body's fixed frame (Earth-centered ECEF, the Moon's mean-Earth or
  principal-axis frame);
- east-north-up tangent frames at a place;
- a parent transform's local frame (a tileset root, a node);
- an iModel's local engineering coordinates, placed by its `ecefLocation`
  or reprojected from its CRS;
- a placement's own frame, where GPU instance matrices live.

Passing an ECEF position where a parent-relative one is expected, or an
iModel-local point as if it were Earth-centered, type-checks today and is
off by thousands of kilometers. A frame tree is the fix: every frame a node
(`Frame`, with its parent and float64 transform), and values carry their
frame in the type, so converting is an explicit walk up and down the tree
(`frame.toFixed(p)`, `a.transformTo(b)`), never an implicit reuse.

- **What changes in the API.** Positions and matrices could be branded by
  frame (`Fixed<Vec3>`, `Local<Mat4, F>`) or wrapped
  (`{ frame, matrix }`). Placements would take a frame-tagged matrix
  (`PlacementOptions.modelMatrix` today: Earth-fixed or relative to
  `parent`, said only in the doc comment), and picks would return points
  in each frame asked for (ECEF and the design's coordinates, as above).
- **When.** Once a second body or engineering frames land: one frame
  (Earth-fixed) plus parent-relative transforms hasn't caused a bug yet,
  while the tree is what would make Moon content and iModel-local
  measurement safe to write.

**Design rule (r41): every option and API that involves the globe, the
sky, light, heights or coordinates names its body, Earth by default.** A
`Body` is a name, a reference ellipsoid and an optional atmosphere
(`src/scene/Body.ts`; `EARTH` today, the Moon and Mars to come with their
frames). What is body-aware so far: `View.body` (whose sky and light a view
sees), the sky and the sky-view table (heights and horizon from the body's
ellipsoid), the per-pixel sunlight (the body's radii in the view uniform,
no WGS84 constants in shaders), and a body without an atmosphere (a black
sky, the sun's whole 132.5 klx; its stars and disk come with the night sky).
The engine builds one atmosphere (the Earth's) and refuses a view of a body
with another until per-body atmospheres exist. Still Earth-only, to convert
as each is touched: the globe (terrain and imagery tiling, level-zero
errors from the WGS84 radius), the camera controllers (GlobeController,
OrbitController, InspectController), horizon culling (`math/horizon.ts`),
height clamping, view links, tile volumes (`streaming/volumes.ts`),
feature coordinates, the Viewer widget, and the sun's position (an Earth
ephemeris). Content declares its body: `3DTILES_ellipsoid` today (the
Moon's tilesets), and 3D Tiles 2.0's georeferencing when it settles (its
draft extensions place content by a CRS and a position on an ellipsoid; the
names and shape were still under discussion when checked, r41).

_Frames 1 results (r61): time and ephemerides._ The first of five plans
for the frames design
(`docs/superpowers/specs/2026-11-05-frames-bodies-measurement-design.md`;
plan `docs/superpowers/plans/2026-11-05-frames-1-time-ephemerides.md`)
landed in `src/time/` and `src/ephemeris/`. The engine's rendering is
unchanged: it still uses `icrfToFixed` and `moonAxes`, and plan 2 switches
it over. What landed, with the worst agreement the tests measured:

- **`Instant`** (TT seconds past J2000, float64; `fromUtc`, `fromTt`,
  `fromTdb`) with leap seconds bundled from NAIF's `naif0012.tls`
  (`LeapSeconds.builtIn()`, expiring 2027-06-28 per IERS Bulletin C 72).
  The store's IERS copy is used only when it expires later.
  - TT advances 2 s across the 2016/2017 leap.
  - TAI−UTC is looked up by TAI (`taiMinusUtcAtTai`), and `toUtc` is exact
    and monotonic: it holds at 23:59:59.999 through the inserted second.
  - UTC→TT and TDB agree with pyerfa's chain within 2.4e-7 s, out to
    2049-12-31.
- **TDB−TT** from ERFA `dtdb`: within 1 ns of pyerfa.
- **EOP** from CelesTrak's `EOP-All.csv` (IERS data): 4-point Lagrange,
  stepping through UT1−TAI across a DAT change. Outside the table it holds
  the last row or returns zero corrections, flagged `degraded`. Samples
  carry `ut1MinusTai`. `atInstant(instant, leap)` locates an instant by
  TAI, so a time inside an inserted second reads the pre-leap day.
  `eop.at(instant.toUtc(leap))` read the post-leap day there, putting UT1
  1 s fast; the final review found it.
- **GCRS→ITRS** (IAU 2006/2000A, CIO-based, ported from ERFA, BSD-3),
  `celestialToTerrestrial(instant, eopSample)` with UT1 = TAI +
  `ut1MinusTai`:
  - against pyerfa: `xy06` 3e-18 rad, `s06` 1e-22 rad, `era00` 6e-14 rad,
    and the full matrix 7.4e-12 (limit 1e-11), over 34 instants that
    include four across the 2016/2017 leap;
  - inside the inserted second, using real EOP lookups: 2.1e-12;
  - 0.0023° from the old `icrfToFixed`.
- **SPICE DAF reader** (SPK and binary PCK, type 2) and **Chebyshev packs**:
  excerpts that record their NAIF source, its SHA-256 and the span. Both
  reject malformed layouts with named errors. The DAF bounds and NEXT
  checks stop a crafted file from looping. Reading segments of other types
  (13, 21 for trajectories) is plan 2's first task.
- **`Ephemeris`** from DE440 (`de440s.bsp`) and the lunar PCK
  (`moon_pa_de440_200625.bpc`, MOON_PA = 31008):
  - Sun, EMB, Earth and Moon within 1.5e-5 m of jplephem at the
    fixtures' TDB, and within 7.1 mm when built from UTC (the float64
    floor below);
  - Moon Euler angles identical to SPICE;
  - J2000→MOON_PA and →MOON_ME within 2.6e-13 of SPICE `pxform`;
  - PA→ME (`moon_de440_250416.tf`) within 5e-20.

  The plan's Earth formula was the old geocentric-Moon form. With SPK's
  301/3 (Moon wrt EMB) it is `emb − moonWrtEmb/EMRAT`; the plan's form was
  about 57 m off. A test against DE440's own 3→399 segment now pins it.
  Summing Chebyshev terms smallest first was needed for ψ (about 1e4 rad).

- **Setup and the store.** `npm run setup` downloads the four sources to
  `~/.cesium-bench/frames` (`FRAMES_DATA_DIR`); nothing downloaded is
  committed. It checks the NAIF files against pinned SHA-256s, validates
  refreshed tables before replacing a good copy, and writes 2000–2050 packs
  (`--frames-span`, inclusive). The dev server serves the store at
  `/frames-data/`, and `npm run test:data` runs the tests against it.
- **`loadFrameData()`** verifies each file's SHA-256 and returns typed
  `warnings` (`leapSecondsExpired`, `eopEnded`). `Ephemeris.contains`
  tests the span without a throw. In the browser it resolves, with the
  geocentric Moon at 386,847 km on 2026-11-05.

The precision floor is `Instant`'s single float64: 2.4e-7 s near 2050. That
is about 1.7e-11 rad of Earth rotation (0.1 mm at the surface), about 7 mm
in SSB-relative positions (the Earth's 30 km/s), and about 0.2 mm Earth to
Moon: all far inside the meter goal. A two-part `Instant` is the fix if a
later plan needs more.

_Frames 2 results (r62): the frame tree and trajectories._ The second of
five plans (`docs/superpowers/plans/2026-11-05-frames-2-frame-tree-trajectories.md`)
landed in `src/frames/`, `src/ephemeris/spk.ts` and `src/trajectory/`. Worst
agreement the tests measured, 2026-11-05:

- **The tree** (`createFrames`): ICRF, HCRS, GCRF, EME2000, ITRF, MOON_ICRF,
  MOON_ME, MOON_PA and `bodyFixed(body)`, with `Frame`, `frameTransform`,
  `FramePoint`/`convertPoint`, `eastNorthUpFrame` and `worldTransformFrame`.
  - The frame bias is within 1e-15 of pyerfa `bp06`.
  - GCRF→ITRF is within 1e-11 of plan 1's fixtures (worst 7.4e-12, the
    float64 TT spacing); Moon ME and PA are within 1e-12.
  - ITRF→MOON_ME translation is within 1 mm.
- **SPK and trajectories**: `readSpk` reads types 2, 8, 9, 12 and 13 and
  NAIF's old "NAIF/DAF" file id; `Trajectory.fromSpk` and `fromOem`;
  `parseOem` and `Instant.fromIso`.
  - Artemis II SPK against SPICE `spkgeo`, over 40 instants (segment edges
    and the shared main and gap-fill endpoints included): positions within
    1.2e-7 m, velocities within 6.0e-9 m/s.
  - DSN stations (DSS-14, DSS-43): within 9.3e-10 m.
  - Orion in MOON_ME against `spkpos`: within 8.7e-5 m.
- **OEM against SPK** (R9), both read as EME2000 with Hermite degree 11:
  at most 0.26 m over 1,286 instants. NAIF's conversion used SPICE's
  approximate TDB.
- **The frame bias at the flyby**: reading EME2000 as ICRF moves Orion by
  28.4 m in MOON_ME at the 2026-04-06T23:00 UTC flyby (R1).
- **The sky from DE440** (`skyState`) against the analytic models: the sun
  within 0.0042°; the Moon within 0.056° at 2026-04-06 and 0.14° at
  2000-06-21 (the analytic Moon's own error), its distance within 0.017%;
  the Moon's pole within 0.0046°.
- **Cost**: `skyState` with data takes 0.43 ms per call, mostly the IAU
  2006/2000A X, Y and s series. It runs once per clock change, so every
  frame while the clock plays. A cache over a short interval would cut it
  if it matters.
- **Earth-only rendering is unchanged without data.** The analytic path is
  tested bit for bit, the Viewer's `frameData` option is off by default,
  and only the bench Explorer opts in.
- **Setup** now also stores the Artemis II OEM, SPK and gap-fill SPK and
  NAIF's DSN station SPK (about 12 MB, SHA-256 pinned, credited to "NASA JSC
  FOD Navigation, via NAIF" and "NAIF/JPL").
- **Gates**: `npm test` 369 passing; `npm run test:data` 34 passing.

Rulings:

- **R1**: the axes behind an SPK's J2000 label are declared (`j2000:
"icrf" | "eme2000"`), not assumed.
- **R2**: frame edges are Newtonian until plan 3, which changes the one
  GCRF→ICRF edge and its tolerances.
- **R3**: rendering falls back (the sky uses the analytic models outside the
  data); frames and trajectories throw.
- **R4**: overlapping SPK data follows SPICE's precedence (later files, then
  later segments, win); OEM segments follow the same rule.
- **R5**: the OEM reader never guesses an interpolation; the Artemis OEM
  needs `interpolation` (Hermite, degree 11).
- **R6**: the world is not re-rooted; content stays Earth-fixed until plan 5.
- **R7**: plan 1's rotations stay row-major 3×3, parent to child; frame
  transforms are column-major float64 4×4; only `matrix.ts` converts.
- **R8**: trajectory files join the setup store by default.
- **R9**: the OEM is the primary Artemis source; the OEM and SPK may differ
  by up to 0.5 m (measured 0.26 m).
- **R10**: the Viewer keeps the analytic sky by default; `frameData` is
  opt-in.
- **R11**: frames carry positions only; velocity transforms are plan 3.

Controller rulings made while building it:

- The GCRF→ITRF rotation bound is 1e-11, plan 1's bound.
- `frameBias` uses ERFA `bp06`'s IAU 2006 construction.
- Sub-microsecond ISO fractions hold to float64 TT's 1.2e-7 s.
- OEM spans honor `USEABLE_START_TIME` and `USEABLE_STOP_TIME`.
- SPK spans clamp to the stored epochs.
- A half-specified OEM interpolation header throws.
- The old "NAIF/DAF" file id is read (the DSN station SPK uses it).
- SPK window sizes are capped at SPICE's limits.

_Frames 3 results (r63): measurement._ The third of five plans
(`docs/superpowers/plans/2026-11-05-frames-3-measurement.md`) landed in
`src/measure/`, with the eq. 11.19 edge in `src/frames/frames.ts` and the
accuracy inputs on `Trajectory` and the EOP table. Rendering is unchanged.
Worst agreement the tests measured, 2026-11-05:

- **Two Earth-centred frames** (R1): `gcrf` is the true GCRS (TT-compatible,
  joined to ICRF by IERS eq. 11.19) and `earthIcrf` carries SPK and OEM data.
  At 3.844e8 m perpendicular to V on 2026-04-06T23:00 UTC the two differ by
  9.48 m.
- **Light time and apparent directions** against SPICE (`shapiro: []`):
  - Earth to Orion: 2.1e-5 m (CN) and 3.1e-5 m (XCN); 1.4e-12 rad (CN+S)
    and 1.7e-12 rad (XCN+S).
  - Earth to the Moon: 1.5e-5 m, 1.4e-13 rad.
  - DSS-43 to Orion: 0.263 m, worst angle times range 0.30 m. This is a
    constant offset of about 8 mas between our ITRF and NAIF's ITRF93 file.
- **Shapiro delay** on the Artemis links: 0.46 to 27 ns.
- **Geodesic distance** against Python geographiclib: 6e-9 m on WGS84,
  1.6e-8 m on the Moon's sphere.
- **Doppler**, DSS-43 from Orion at 2026-04-06T23:30 UTC: range rate
  236.93 m/s, shift -1750.15 Hz at 2216.5 MHz. The worst difference from
  1 − rr/c is 2.45e-9 (the proper-time terms). Range-rate noise is 1.8 mm/s
  rms and 2.9 mm/s at most, from float64 TDB quantization.
- **Occultation**, Canberra DSS-43 (Orion 25.5° up at 22:44 UTC, April 6):
  first blocked by the Moon at 22:43:00 (60 s before the published 22:44),
  first clear at 23:23:20 (100 s before 23:25). Goldstone and Madrid had
  Orion below their horizons.
- **DSN Now**: 22 rows from 8 archived snapshots. The displayed range is
  one figure per spacecraft, identical at every dish (upleg equals downleg).
  It agrees with our per-dish light-time ranges within 5.7% (round trip
  4.9%) and with no geometry better (the geocentric range misses by up to
  27%), with no consistent lag. So it can't validate to its rounding as the
  spec hoped; it stays as a 30% sanity check.
- **An accuracy statement**, DSS-26 from Orion at 2026-04-06T15:08:26 UTC:
  10.05 m. Terms: `coordinateScale` 10.04 m (the OEM's unstated TT/TDB
  scale), Orion's position sigma 0.49 m, Earth orientation 0.014 m,
  ephemeris 0.01 m, light time 0.001 m. At the flight's start Orion's sigma
  is 50.35 m.
- **Orion's OEM covariance is in m²**, not CCSDS's km²: in km² its velocity
  sigmas would be about 12 m/s.
- **Gates**: `npm test` 453 passing; `npm run test:data` 48 passing.

Rulings:

- **R1**: two Earth-centred frames; SPK and OEM data sit under `EARTH_ICRF`.
- **R2**: the Moon's edge stays Newtonian (3 cm or less, stated, not applied).
- **R3**: velocities are central differences over 0.5 s, one-sided at data edges.
- **R4**: Doppler includes both ends' proper-time rates.
- **R5**: light time follows eq. 11.17 with Sun, Earth and Moon Shapiro terms.
- **R6**: apparent directions are light time plus stellar aberration (`CN+S`, `XCN+S`).
- **R7**: accuracy never claims more than the inputs support; an unknown term makes `meters` undefined.
- **R8**: snapping goes to plan 4 and frame-tagged picking to plan 5.
- **R9**: a point carrying its own instant gets geometry only.
- **R10**: the published occultation is checked to ±2 min.

Controller rulings made while building it:

- SPK and OEM data are read under `EARTH_ICRF` (R1's second frame).
- Task 4's tolerances: DSS-43 directions 0.5 m per range; the Shapiro bound
  is 0.1 to 50 ns.
- Derivatives at data edges are 3-point one-sided; range rate is good to mm/s
  (quantization-limited), not R3's 1e-7 m/s.
- `properTimeRate` leaves out a body's own potential at its center.
- Line of sight treats an endpoint below the ellipsoid as on it.
- Predicted EOP is floored at the measured sigmas, and degraded EOP gives no
  number.
- The trajectory term comes from the nearest trajectory ancestor of a frame.
- `signal: false` also omits line of sight.
- DSN Now is a 30% sanity check (above).
- `geographiclib-geodesic` was checked with Snyk's package health (Healthy,
  0 vulnerabilities, no dependencies). Once the owner trusted the repo in
  Snyk, the SCA scan of packages/next's production dependencies found 0
  issues (2026-11-05).

_Carried forward from frames plans 2 and 3._ These are deferred items that
are real work. The test-strength and wording nits the reviews raised are left
out, because none of them changes a result.

- **Plan 5:** a SPICE `gfoclt` fixture for the Moon's occultation of Orion
  from DSS-43. Today's check is against the published minute (±120 s), from
  one complex. The fixture would make it a sub-second validation.
- **Plan 5:** cache `skyState`'s IAU 2006/2000A series (X, Y, s) over
  minutes. It costs about 0.1–0.4 ms per clock change and runs every frame
  while the clock plays. This is already in plan 3's roadmap.
- **Plan 5:** bundle size. `widgets/Viewer.ts` imports `skyState` and
  `loadFrameData` statically, so every Viewer bundle carries the ERFA tables
  (about 100 KB) and the pack readers, even with `frameData` off. Load that
  path with a dynamic `import()`.
- **Plan 5:** surface `FrameData.warnings` in the Viewer and the bench
  Explorer. These are an expired leap-second table, and an EOP table that
  ends before now. Today they're only on the returned object.
- **Plan 5:** a unit test for the Viewer's `frameData` option. It would cover
  a URL or an object, data arriving late, and a load that fails with one
  warning.
- ~~**Plan 4 or later:** `measure` solves the downlink light time twice, once
  inside `downlink` and again for line of sight. Return the solution from
  the leg internally.~~ Done (plan 5b, Task 10): the downlink's solution goes to the line of sight.
- ~~**Plan 4b (owner's requirement, 2026-11-06): global geoid and
  height-system coverage, lazily loaded.**~~ Done in plan 4b (see "Frames 4b
  results" below): the catalog pin and grid store (Task 1), verified PROJ
  bytes (Task 2), one verified grid set on both platforms (Task 3), the dev
  server's `/proj-grids/` (Task 4), `EngineeringFrame.load` (Task 6), the
  opt-in EGM96 and EGM2008 fallbacks (Task 7), and the geoid cases checked
  against their publishers (Task 9). Cropped regional tiles aren't built
  (carried forward). The original entry follows. The portfolio needs the country
  and region geoids and height systems, with EGM96 and EGM2008 as fallbacks,
  not only GEOID18. Facts checked 2026-11-06:
  - **PROJ-data's catalog** (`cdn.proj.org/files.geojson`) lists 458 grids
    from 32 countries, 0.91 GB in all. Each entry has a `sha256sum`, so
    setup and the server verify against the catalog instead of hand pins.
  - **EGM96** (`us_nga_egm96_15.tif`) is 2.7 MB.
  - **EGM2008** at 2.5′ (`us_nga_egm08_25.tif`) is 80.6 MB. The 1′ grid is
    not on the CDN.
  - **The CDN sends no CORS headers,** so grids are self-hosted: served by
    the dev server, or by the user's own mirror using the same layout.
  - **To design in 4b:**
    - Pin the catalog itself, by hash and version, as the trust root.
    - The dev server fetches a grid on first request into the store,
      verifies it against the catalog, and serves it. Setup can prefetch
      sets.
    - At run time, an operation's candidate grids are known before loading
      (PROJ names them even when unavailable). Fetch the first candidate's
      grids, load them, then resolve. This is an async step before
      `resolveOperation`, and plan 4a's R2 still holds: no silent fallback.
    - EGM96 and EGM2008 fallbacks are opt-in per frame and named. A
      fallback adds an accuracy term for the offset between the global
      model and the local datum.
    - Browser memory for large grids: PROJ loads whole files into the
      WebAssembly FS (80 MB for EGM2008). Consider cropped regional tiles
      made by setup.
    - Keep the grid source a configurable base URL, with cdn.proj.org's
      file layout and catalog format. A hosted service, such as Cesium ion
      later (owner's suggestion), can then serve the grids, with CORS and
      possibly cropped tiles, with no engine change. The dev-server cache is
      only the local-development default.
- **Done (r65, built before 4b): a gallery example for frames and
  projections** (owner's request, 2026-11-06; results are in "Frames example
  results" below). It shows off the tree-based transforms and the PROJ work,
  and stress-tests them. **What 4b adds to it:** tileset placement modes
  (rigid and exact placement of a tileset on a frame) and the global-geoid
  cases (EGM96, EGM2008 and the country geoids, from the entry above). Both
  need library work that the example could not use. Both are done: plan 4b's
  Task 21 added them to the explorer's catalog as two groups, global geoids
  and tileset placement. The list below is the
  original request, kept as the record of what was asked.
  - **The tree, visualized live at the clock's time.** It covers:
    - ICRF, HCRS and EARTH_ICRF;
    - GCRF (with eq. 11.19) and ITRF;
    - EME2000;
    - MOON_ICRF, MOON_ME and MOON_PA;
    - local ENU and world-transform frames;
    - trajectories;
    - engineering frames.
  - **Each edge labelled with its kind:** Newtonian translation, rotation,
    the IERS affine edge, or a recorded PROJ operation with its pipeline,
    grids and accuracy.
  - **Stress tests run on the page:**
    - round trips across many CRSs: UTM zones, State Plane in US and
      international feet, polar stereographic, lunar grids, and site
      transforms with rotation and scale;
    - points far from a projection's origin and at zone edges;
    - instants across a leap second, past the EOP table and in trajectory
      gaps;
    - each result shown with its accuracy statement, and pass/fail against
      the stated tolerance.
  - **The viewer, not just a panel (owner's addition, 2026-11-06),** so the
    transforms can be seen working:
    - axis triads drawn for the selected frames at their true placement:
      ITRF and ENU on the globe, a site grid's rotated axes, the Moon's ME
      and PA axes, EME2000 against ICRF (the frame bias exaggerated on a
      control);
    - a design grid (a projected CRS's graticule and a site grid) draped
      on the globe, so projection distortion and grid convergence are
      visible;
    - a rigid placement drawn next to the exact reprojection of the same
      long line, showing the sag growing away from the anchor;
    - round-trip test points drawn as markers, coloured by error against
      tolerance;
    - selecting a tree node moves the camera to that frame and highlights
      its path to the root.
- **Plan 4 or later:** `src/frames/frames.ts` imports its constants from
  `src/measure/constants.ts`, so the frames layer depends on measurement.
  Move the shared constants to a neutral module.

_Frames 4a results (r64): engineering frames._ The fourth of five plans
(`docs/superpowers/plans/2026-11-05-frames-4a-engineering-frames.md`) landed
in `src/engineering/` (`proj.ts`, `crs.ts`, `EngineeringFrame.ts`,
`factors.ts`, `alignment.ts`, `fresnel.ts`) and `src/measure/` (design points
and the `projection` accuracy term). Rendering is unchanged, and nothing
loads PROJ until an engineering frame is created. Worst agreement the tests
measured, 2026-11-05:

- **PROJ against pyproj 3.8.0** (PROJ 9.8.1; the engine runs 9.7.1), four
  cases of 12 points, forward and inverse: exactly 0 m, against a tolerance of
  1e-6 m. The cases are California zone 3 in US survey feet with NAVD88,
  Arizona Central in international feet, UTM 11N, and the Moon's south polar
  stereographic. The recorded operation equals pyproj's choice in all four. The
  browser (WebAssembly) build gives the Node result to 1 ulp in height
  (1e-14 m).
- **Round trips.** Design to body-fixed to design, over 21 points on a 50 km
  line and 100 km from the central meridian, with a site transform (rotation
  12.5°, scale 1.0000375): 3.1e-9 m, against a limit of 1e-4 m. The Moon:
  1.4e-9 m. A rigid placement's inverse of its own forward: 2.3e-10 m. The
  site transform's own round trip is exact to 1e-12.
- **Factors against pyproj `get_factors`.** Scale: 5.4e-14 (California),
  2.0e-13 (Arizona), 0 (UTM) and 6.0e-12 (Moon polar). Convergence: 2.3e-14 rad,
  0, 0 and 1.9e-13 rad. The Earth's tolerance is 1e-12 and the Moon's 1e-10.
  The scale is PROJ's parallel scale: its meridional and parallel scales differ
  by up to 1.5e-11 for a conformal projection.
- **Rigid-placement sag** at 10 km of grid east of the anchor: 7.80 m, in the
  spec's 7.8 m ± 1.5 m.
- **Units.** EPSG:6420 and a WKT2 copy of the same CRS with international-foot
  axes, at the same numbers, differ by 2.0034e-6 in ratio (the unit ratio
  is 2.000004e-6; the remainder is the scale factor's change over the 4 m
  origin shift). PROJ's US survey foot is 0.30480060960121924 m, 1 ulp above
  1200/3937.
- **Alignment recovery.** `stationOffset(pointAt(s, o))` returns `(s, o)`
  within 4.6e-13 design units at a start of (1000, 2000), over 20,000 random
  points plus every join and end, left and right. At State Plane magnitudes
  (start (6,000,000, 2,000,000)) it is 2.6e-10 for station and 4.8e-10 for
  offset, which is the ulp of the coordinate itself (9.3e-10). A point on the
  centerline has offset within 2.1e-13. Near the centre of curvature the
  station is known only to about 3.5e-9 (offset -90, radius 100, at E =
  6,000,000), the input's rounding times R/(R - |offset|). That is irreducible
  and an independent exact foot agrees to 2.3e-13. A spiral whose
  estimated Fresnel cancellation error exceeds 1e-11 design units (radii
  nearly equal) is evaluated by quadrature instead (6.3e-13 or better).
- **Fresnel integrals** against SciPy 1.16.2 over 6,500 points: 9.9e-16
  relative below t = 1.5, 1.9e-15 up to t = 6 and 5.8e-15 up to t = 100.
  At large t the phase is reduced exactly, and the values match an exact
  reference to 5.6e-17 where SciPy's own phase loss reaches 1.9e-12.
- **Design measurement.** 10,000 ftUS of design distance in California zone 3
  (site scale 1.0000375) is a true distance of 3048.324343749 m. The relation
  `distance × siteScale × metersPerUnit / combinedFactor.mean` predicts it to
  3.3e-6 m. A design measurement equals the same call on the body-fixed points
  to 1e-9 m. The `projection` term for NAD83(2011) + NAVD88 to WGS 84 with
  GEOID18 is 2.015 m (Arizona's operation without a grid, 4 m; the Moon's
  south polar, undefined).
- **Gates**: `npm test` 523 passing; `npm run test:data` 110 passing.

Rulings:

- **R1**: PROJ comes from proj.js v0.9.2's GitHub release, pinned in setup, not from npm (the npm package downloads its binaries on every install).
- **R2**: a frame records its PROJ operation at creation, takes the first candidate whose grids are loaded, and throws naming a missing grid (never a silent ballpark).
- **R3**: CRS references follow the 3D Tiles 2.0 draft's `EXT_geospatial_crs`; the site transform, placement and alignments live on the frame definition, and 4b proposes them as draft additions.
- **R4**: PROJ stops at the body's geographic CRS and the engine's `Ellipsoid` does the rest. Amended: `proj.db` 9.7.1 has no Moon 3D CRS, so the Moon uses `IAU_2015:30100` (2D) and heights pass through as heights above the 1,737,400 m sphere.
- **R5**: units come from the CRS, never assumed (US survey foot 1200/3937 m, international foot 0.3048 m).
- **R6**: the site transform is `[E, N] = [E0, N0] + s·R(θ)·[e, n]`, `U = U0 + u`, with height unscaled and an exact inverse.
- **R7**: scale and convergence come from `proj_factors`, and the combined factor is k × R/(R + h).
- **R8**: alignment geometry is exact to float64 with Fresnel clothoids, a point past an end throws "outside the alignment", and a tie takes the lower station.
- **R9**: design ends add a `projection` accuracy term from PROJ's operation accuracy, and undefined (never small) when PROJ states none or the operation is a ballpark one.

Controller rulings made while building it:

- A rigid placement takes its grid north from the operation itself (one design
  unit along +N, projected on the tangent plane), so it needs no convergence
  formula. Its scale is `metersPerUnit`, not the point scale factor.
- The design result gains `siteScale`, so the ground distance is
  `distance × siteScale × metersPerUnit / combinedFactor.mean`.
- An engineering frame requires a projected CRS. A geographic design CRS
  throws, naming the CRS.
- `epoch` is the coordinate time of a time-dependent operation. `proj_create`
  rejects `CRS@epoch`, so it is not part of the definition string.
- A CRS or pinned pipeline that `proj_create` cannot build is detected by its
  empty result (PROJ does not throw), and a ballpark operation by its name.
- The native module read `PROJ_DATA` at first use, so a second base moved the
  first one's grids. `loadNode` now forces initialization, with a regression
  test.
- `gridFactors` evaluates at the inverse projection of the point's grid
  coordinates on the CRS's own datum, not at the WGS84 position (1-2 m away,
  1e-10 in k).
- Near the join and ends of an element the perpendicular-foot window scales with
  float64 rounding of the coordinates and with 1/|f'| at the foot, so a point
  at the end station is not rejected by its own rounding. A point past the end
  still throws.
- Snyk: a Medium CWE-23 at `proj.ts` `writeGrids` is accepted as a false
  positive (the target is the WebAssembly module's in-memory file system and
  grid names are validated as plain file names). `src/measure` has 0 issues.
  `@emnapi/runtime` 1.8.1 is Healthy with 0 vulnerabilities.

_Frames 4a final review._ No silent wrong answers. The reviewer checked
convergence against RigidPlacement's north (8e-9 rad, the sign right in both
hemispheres), and WebAssembly against native PROJ (body-fixed within 9e-10 m,
scale factor within 1.8e-13). The single fix wave did five things:

- exported the 4a API from `src/index.ts`, with `@emnapi/runtime` now a
  dynamic import;
- removed a false end-of-alignment throw near the centre of curvature;
- added WKT2 `BOUNDCRS` support, for the TOWGS84 CRSs GDAL and iModels
  export. Units and factors come from the source CRS, and the operation from
  the bound CRS;
- fixed five setup and loader robustness defects;
- corrected the README.

The re-review then found that every 2D projected CRS with a geocentric
Helmert round-tripped off by millimetres: EPSG:30169 by 2.8 mm, EPSG:26741 by
0.76 mm. The cause is PROJ pushing the height around the Helmert. The inverse
is now refined against the forward, so these round trips are under 1e-8 m, and
an inverse that can't reproduce its forward within 1e-6 m throws. Final
counts: `npm test` 533 passed, `npm run test:data` 121 passed.

_Carried forward from frames plan 4a._ These are deferred items that are real
work. The test-strength and wording nits the reviews raised are left out,
because none of them changes a result.

- ~~**Plan 4b:** tests for design points on the Moon, across two frames and
  with `signal: false`.~~ Done (plan 4b, Task 8). Today's design-measurement
  tests cover the Earth, one frame and the signal path.
- ~~**Plan 4b: grid names in pinned pipelines.**~~ They are read from `+grids=`
  only. A pinned pipeline using `+nadgrids` or `+geoidgrids`, or an optional
  `@` grid, reports an empty or partial grid list. The missing-grid check and
  the accuracy note then don't name its files. Parse those keys as well, in the
  same step that fetches grids. Done (plan 4b, Task 5): `pipelineGrids` reads
  every grid key, with `@` for an optional grid.
- ~~**Plan 4b: a coarser operation taken silently.**~~ Done (plan 4b, Tasks 6
  and 8: `betterCandidates` and the `coarser-operation` warning; the "better"
  rule as the owner amended it). Without its NADCON grid,
  PROJ ranks EPSG:26741's 7 m Helmert first, and the 5 m and 2.15 m candidates
  are never reported. The stated accuracy is honest, but R2 and Review Focus 1
  disagree here. Record the better candidates and the grids they need.
- ~~**Plan 4b: grids differ by platform.**~~ Done (plan 4b, Task 3; Task 21
  removed Node's legacy default). Node saw every grid in `base`; the
  browser saw only the listed ones. Both now see exactly the grids loaded.
- **Plan 4b:** after a PROJ upgrade, regenerate `test/fixtures/frames/proj.json`
  with `scripts/frameFixtures.py`. The 1e-12 factor tolerance against pyproj
  holds because both sides see bit-identical inputs, and sits at PROJ's
  numerical-differentiation noise floor. Folded into plan 4b's Task 2: the
  fixture records `engineProjVersion`, and a test fails, saying to regenerate,
  when the loaded PROJ's version differs.
- ~~**Plan 4b: the native loader.**~~ Done (plan 4b, Tasks 2 and 3). In
  `loadNode` (`src/engineering/proj.ts`), the native `.node` was not re-hashed
  at load, and `PROJ_DATA` was set process-wide. The `.node` is now checked
  against setup's manifest entry, and `PROJ_DATA` points at a private
  per-process staging directory (one PROJ base per process).
- ~~**Plan 4b: PROJ's log noise.**~~ Done (plan 4b, Task 3: `PJ_LOG_NONE`
  while listing; `test:data`'s PROJ lines went from 243 to 1). Listing
  candidates whose grids are missing made PROJ write to stderr (and the
  browser console).
- ~~**Plan 5:** `measureSpan` runs `gridFactors` twice per sample, a `proj_factors`
  call at each end. Cache the factors by design point, or compute them once for
  a span's fixed ends.~~ Done (plan 5b, Task 10): a span computes its two ends' factors once; 100 samples make 2 `proj_factors` calls.
- ~~**Frames example: PROJ object lifetimes.**~~ Neither build exposes
  `proj_destroy`, and the binding's glue uses a `FinalizationRegistry`. PROJ
  objects are probably freed on garbage collection. The example's cases make
  many frames, but it measured no heap, so this is still unverified. Check it
  with a heap measurement over repeated "Run all" runs, rather than planning
  explicit destroy calls. Done (plan 4b, Task 6): the resident memory stayed
  flat over 300,000 probes, so PROJ objects are freed on garbage collection.

_Frames example results (r65): the frames-and-projections gallery example._
The example from the entry above landed in
`packages/next/examples/frames-explorer/` (plan
`docs/superpowers/plans/2026-11-06-frames-explorer-example.md`), built before
4b. It uses only the public API, except for the library fixes below. It has
the frame tree live at the clock's time, stress tests that run in a worker,
overlays on the globe, a six-stop tour, and a "try your own CRS" area (paste
WKT2 for a bound-CRS check; an ion asset ID loads as a tileset for context,
because ion exposes no CRS for an asset). Measured 2026-11-06:

- **Catalog.** 77 cases and 225 results in 24 groups, 54 of them
  fingerprinted (pipeline, grids and coordinates, recorded in
  `fingerprints.json`). The data test (`npm run test:data`) runs all of them
  in 3.8 s alone (up to 8 s on a loaded machine; the worker's run reads 5–7 s).
  The page's "Run all" gives 212 passed, 0 failed and 13 shown (results with
  no pass or fail, such as effect sizes), which is the data test's 225.
  Without frame data, the checks that need none still run and the rest are
  skipped as missing, with the reason shown.
- **Browser against Node.** The browser (WebAssembly PROJ) and native PROJ
  agree on pipelines and grids exactly. Their coordinates differ by up to
  1.86e-9 m, the last bits of musl's libm against the host's. The check
  allows 16 ULP of the point's magnitude (about 1.5e-8 m at Earth radius). The
  worst case reads 3.75 ULP (IOGP's Transverse Mercator forward). The flat
  1e-9 m the plan first set is about 1 ULP at 6.4e6 m, so it was impossible by
  construction. Drift that matters shows up at a millimetre or more.
- **Reference values (R10).** Every expected value is from a source that
  does not use this library or PROJ, retrieved 2026-11-06:
  - NGS Data Sheets for five marks (California 3, Florida East,
    Pennsylvania South, Colorado Central, Arizona Central): SPC, UTM and
    combined factors, with GEOID18 and NAVD 88 heights;
  - IOGP 373-7-2 worked examples (Lambert conic 2SP, Transverse Mercator,
    polar stereographic B, Pseudo-Mercator, the position-vector and
    time-dependent Helmerts), the Ordnance Survey Transverse Mercator worked
    example, and the Wyoming DOT clothoid table;
  - EPSG registry records (transformations 1311, 1133, 1134, 1314, 15484,
    1175 and 8970, ellipsoids, the WGS 84 ensemble), ODOT's OCRS handbook
    (±10 ppm), Snyder (USGS PP 1395), IERS Conventions 2010, NAIF's lunar
    frame kernels, DSN 810-005 (DSS 43), the GDA2020 Technical Manual,
    Ashby & Patla (2024) for lunar time, and the IFC 4.3 Annex E examples;
  - bound-CRS WKT2 inputs written by PROJ 9.7.1's `proj_as_wkt`, from
    `+towgs84` definitions (GDAL and `projinfo` are not installed). These
    are inputs, not expected values.

  Not fetched or not usable: Mahun's spiral chapter (Cloudflare), the TDOT
  spiral guide (approximate formulas and arithmetic errors in its example),
  buildingSMART's geo-referencing user guide (behind a login), the GDA2020
  manual v1.7 and v1.8 (icsm.gov.au timed out; the archived v1.2 was used),
  and USNO's archived leap-second page (empty; IS-GPS-200N was used). No
  case was dropped for a missing source. The IFC case checks the model
  origin and x axis of Annex E.7.3 against the file's own `IfcSite` values
  (0.96 mm), because no public example gives a non-origin model point; the
  example's missing `Scale` for millimetre units is recorded as a finding.
  IOGP's Transverse Mercator forward example differs from the library by
  9.9 mm, while the Ordnance Survey worked example agrees. IOGP's uses the
  JHS formulas, so the difference is the method. It is shown as an effect
  size, and the Ordnance Survey example is the check.

- **Rigid-placement budget** (ground-scaled site grid, measured east from its
  origin; the limit for both checks is 10% of √(2Rε)):

  | Site           | 1 mm     | 1 cm     | 10 cm     | Off √(2Rε) by |
  | -------------- | -------- | -------- | --------- | ------------- |
  | 0°, UTM 31N    | 112.94 m | 357.16 m | 1129.44 m | 0.17%         |
  | 37°, UTM 10N   | 113.01 m | 357.38 m | 1130.12 m | 0.11%         |
  | 60°, UTM 32N   | 113.09 m | 357.61 m | 1130.86 m | 0.04%         |
  | 80°, EPSG:3413 | 112.91 m | 357.06 m | 1129.12 m | 0.19%         |

  So a rigid placement stays within a centimetre of exact out to about 357 m
  from its anchor. The tour's rigid-against-exact line sags 31.4 m at 20 km.

- **Other effect sizes.** Giving no coordinate epoch moves a point by 29.88 cm
  in 16 years (NAD83(2011) from ITRF2014, EPSG 8970). The US survey foot
  against the international foot differs by 2.0 ppm. Lunar time runs 55.99
  µs/day against the Earth's geoid, averaged over the synodic month (Ashby &
  Patla: 56.02); the plan's sidereal month gave 57.53 µs/day, 2.7% off,
  because two ~2 µs/day synodic terms do not average out over it, so the
  synodic month is the right period. The tour's walk from MOON_PA to ITRF
  composes to ±32 mm (ephemeris 10 mm, the Moon's relativity term 30 mm,
  Earth orientation under 0.1%), where the design stub had ±1 m. The
  library's accuracy statement governs.
- **Library bugs the references caught, now fixed:**
  - **`gridFactors` on spherical-method CRSs.** EPSG:3857 returned the
    sphere's scale (1/cos φ), not the ellipsoid's, so Web Mercator combined
    factors were wrong by 0.25% at 60°. The same fault was in EASE-Grid
    (3975, 3973), EPSG:32662, ESRI:54002 and the ARC System zones (2.5e-3
    in k at 60°). Detection now uses the conversion's method from PROJ's API
    (Pseudo-Mercator and the authalic and equidistant-cylindrical
    "(Spherical)" methods), not PROJ-string tokens, and factors come from
    PROJ's derivatives against the CRS's true ellipsoid. Every other CRS keeps
    PROJ's own factors. A related fault: the projection rebuilt from a +R_A
    string inverted a point 0.066° off, so `gridFactors` now locates the
    point with the CRS's own conversion inverse. The derivative path throws at a
    pole, and NAD27, UPS and 3413 at the pole have tests. It costs about 18 µs per call.
  - **Warning codes.** `AccuracyStatement.warningCodes` (optional, kept in
    step with `warnings`) and the `WarningCode` export, so a caller can tell
    a signal-only warning from one that bears on the position without
    matching text. The walk's amber state depends on it.
  - **`build:lib`'s types.** The Node-only PROJ loader moved to
    `src/engineering/projNode.ts`, typed by the little of Node it uses, so
    `tsc -p tsconfig.lib.json` passes with no new dependency. `npm run
build:lib` exits 0, and `loadProj` from its output resolves in a browser
    page in about 115 ms.
  - **`onProgress` loaders.** `loadProj` and `loadFrameData` take an optional
    `onProgress(item, received, total)`. The WebAssembly is passed to the
    glue as one `ArrayBuffer` (the JS heap held three copies of it before).
    `readWithProgress` is exported. The dev server's `/frames-data/` now
    sends `Content-Length`, so dev progress bars are determinate.
  - Smaller additions: `ResolveOptions` and `listOperations` take an optional
    area of interest (PROJ's default spatial filter drops every partial-area
    ED50 transformation, leaving the ballpark one); `listOperations` and
    `areaOfUse` rethrow PROJ's errors with a `cause`, not `[]`;
    `earthOrientationSigma`, `properTimeRate` and `rotationPart` are
    exported.
- **The gallery contract.** An example's `run` may now return
  `{ dispose, panel }`: a React panel that Dyno renders (StrataKit
  components, unstyled by Dyno's DOM-panel rules, which are now scoped with
  `:where(.examples-panel:not(.react))`). The context gains `params`,
  `setParams` and `watchParams` (deep links such as
  `?select=frame:MOON_PA&lens=space&tour=...` go through them, not
  `location.href`), and `link()` for "Copy link". The runner effect is
  passive, so the panel's cleanups run before `dispose`. Leaving an example
  whose `dispose` throws reports in its own dismissible notice.
- **The owner's "no slab" bug** (Examples → realtime-tracks → back showed
  "World: no slab 0"). The cause was the passive-effect runner above: React
  runs a removed tree's passive cleanups parent first, so the page destroyed
  the engine before the runner disposed the example. `share()` in
  `bench/suite/views/exampleRun.ts` now refcounts the engine. It is destroyed
  after the page's release and after every run's cleanup and async start, in
  any order. Five unit tests, and the owner's path, two other examples, quick
  switches and a mid-start leave were checked in the browser.
- **Production-build check (R13).** `npm run build` served statically
  (dist plus `/frames-data/` with `Content-Length`): PROJ loads, Run all gives
  212 / 0 / 13, the design grid draws at ±2.00 m and Orion's path at ±10 m.
  The module worker and its runtime `import()` of `proj_capi.mjs` work with
  no `worker.format` change, so §13.14's "`loadProj` in a production build"
  item is closed, and so is the `build:lib` check. The longest
  requestAnimationFrame gap during Run all was 33 ms in the first build
  and 50 ms in the repo's build (limit 100 ms); the dev server showed
  100–150 ms, from StrictMode's double render and dev React. Production is
  what users run, so the dev figure is informational.
- **Screenshots and reviews.** Two UX reviews on the most capable model,
  against the design stubs and then the real page (headless Chrome with
  Metal; the bundled Chromium falls back to SwiftShader and draws no globe).
  Findings, all fixed:
  - the first pass found the globe undesigned, the tree walk not adding up to
    the composed statement, accuracies stated inconsistently, and result rows
    breaking at 380 px (4 Critical, 19 Important);
  - the second found stop 4 not showing the rigid-placement sag (now a side
    camera, with the sag drawn ×50 and labelled, plus a "Show true scale"
    switch), the walk amber from a signal-only warning, geocentric triads
    running through the Earth, stop 2 near-black at 3600× and then washed
    out (exposure −1.5 at desktop widths, −0.6 narrow), and the narrow
    caption covering downward tips (it folds under 560 px);
  - the browser checks found the HUD's focus ring at 2.4:1 in light mode
    (now 11.6:1) and wrong "Compared against" text on several results.
  - 45 browser checks and 3 more pass: tree, tour, deep links, report, keyboard,
    contrast (0 below AA), reduced motion, Slow 4G loading, switching away
    mid-load, missing data, and a token search (the ion token appears
    nowhere: report, console, URL, storage or DOM).
- **Gates**: `npm test` 859 passing; `npm run test:data` 187 passing;
  `snyk_code_scan` on the example and its tests, 0 issues. In `src/engineering`
  and `vite.config.ts`, the Snyk findings are all at HEAD before this plan
  (the accepted CWE-23 in `proj.ts`, and 5 in `vite.config.ts`, below).

_Carried forward from the frames example._ These are deferred items that are
real work. The wording and test-strength nits the reviews raised are left out,
because none of them changes a result.

- **Renderer / engine: a screen-space wide-line material.** The overlays use
  1-pixel line lists, with hierarchy by colour strength and no halos. A
  wide line with a halo would let them read at a distance.
- **Renderer / engine: a no-depth-test draw flag.** The geocentric triads need
  x-ray dashes where they pass behind the Earth. Today a whole axis is hidden
  while its tip is behind the limb.
- **Renderer / engine: a per-layer imagery brightness and saturation control.**
  The example dims the lit globe under overlays with exposure compensation,
  which has no desaturation.
- **Renderer / engine: document draw tints above 1.** The overlays' lighter
  tint relies on them. They render as expected in Chrome on Metal, and the
  engine does not say they are allowed.
- **Renderer / engine: ray artifacts in the lunar terrain's shadows** at tour
  stop 6 (13.10's ray queries).
- **Dyno: a resizable side column that stacks below about 900 px.** The panel
  takes 579 px of 1440, and 380 px of 900.
- ~~**Dyno: a Viewer time-control option to show UTC.**~~ Done in the
  scenarios plan (Task 9): `attachTimeControls` takes `zone` and `label`
  options, and the explorer opens in UTC.
- **Dyno: the root error alert is misleading.** Any error reads "Dyno could
  not read the results".
- ~~**Dyno: with no ion token, the default imagery throws** an uncaught `ion
asset 2: no access token`, on every example.~~ Done (ion token setting): the
  token is a Dyno-wide setting (the rail's ion token popover), an empty
  `VITE_ION_TOKEN` no longer counts as one, and an example whose ion content
  is turned away shows "Paste an ion token" with the button that opens the
  setting. Production builds never contain the `.env.local` token.
- **Dyno: the other `.env.local` keys still go into builds when set.**
  `VITE_GOOGLE_MAPS_KEY` (`bench/suite/suite.ts`) and `VITE_ITWIN_SHARE_KEY`
  (the Viewer's iTwin tab) are inlined as the ion token was. Gate them on
  `import.meta.env.DEV` and add them to `keepEnvSecretsOut`
  (`scripts/vitePluginEnvSecrets.ts`), with a paste field where a build
  needs one.
- **Dyno: a static host of the built gallery needs `/specs-data/`** for
  Real-time tracks' truck model (and `/frames-data/` for the frames
  explorer), which only the dev server provides. The example fails with
  "Unexpected token '<'".
- **Dyno: `/favicon.ico` 404s** on every page.
- **Dyno: a static host of the built gallery needs `/bench-results/index.json`,**
  which only the dev server provides. Without it the gallery shows the
  misleading alert above.
- **Dyno: dev-server endpoint hardening (security).** Snyk on `vite.config.ts`
  finds 5 issues, all from before this example (the Dyno image regression
  and the M0 spikes): two High CWE-23 path traversals at the image-regression
  `readFileSync` and `writeFileSync` endpoints, a CWE-770 on `serveDirectory`
  and two CWE-209 error leaks. The example added one `Content-Length` line.
- **Dyno: the example runner's loose ends.** A rollback of the search params
  between two quick `setParams` calls (`searchKey` and `store.sync`) is
  unverified. A run left mid-way still calls `dispose` after `viewer.destroy`
  and `resumePresentation` (it predates the example).
- **Plan 5: `loadFrameData` takes no `AbortSignal`.** The example terminates
  its worker instead.
- **Plan 5: a bogus huge `Content-Length` makes `readWithProgress` preallocate
  and possibly throw.** Cap the preallocation, or grow the buffer.
- **Plan 5: the stress context's `frames` getter is non-enumerable,** so
  spreading the context loses it. Nothing spreads it today.
- ~~**Plan 4b: a test case for Mercator (Spherical)**~~ (EPSG methods 1026 and
  9841). Folded into plan 4b's Task 9: WKT2 cases on a sphere agree with
  1/cos φ to 6.1 × 10⁻¹³, and on an ellipsoid `gridFactors` refuses, saying
  PROJ projects it on the conformal sphere R_C(φ0). Supporting R_C is carried
  forward. PROJ 9.7.1 can't build 9841 at all.
- ~~**Plan 4b: `frameCache` is unbounded** in the worker.~~ Closed by
  `e9f362f3a5`, which bounds it.
- ~~**Plan 4b: verify PROJ's served bytes in the browser.**~~ Done (plan 4b,
  Task 2). `loadProj`'s browser path didn't check the SHA-256 of `proj.db` or the WebAssembly it
  fetches. The example's report labels them "manifest SHA-256 (not verified
  in the browser)". Hash the bytes after the fetch, and refuse a mismatch, as
  setup already does in Node.
- ~~**Plan 5: explicit timeouts for slow data tests.** These pre-plan tests run
  on vitest's 5 s default and can time out under heavy machine load:
  `test/data/trajectory.test.ts:147` (about 2.6 s),
  `test/data/trajectory.test.ts:197` (about 2.0 s) and
  `test/data/sky.test.ts:86` (about 1.2 s). One `test:data` run failed this
  way during the example's final fix wave. Give each an explicit timeout.~~ Done (plan 5b, Task 1): 30 s on each.
- **Plan 5: a frame's revision (change) signal** (Task 7b, the robot arm).
  A frame whose matrix depends on state beyond the instant (a joint's angle)
  must be built with `cache: false`, and nothing tells a renderer or a cache
  that it moved. A revision counter the frame bumps when its state changes
  would let it stay cached and let the renderer redraw only then.
- **Plan 3: velocities through app-defined frames.** `Frame` carries
  positions only; a joint turning at a rate, or a trajectory under a moving
  joint, has no velocity until plan 3's rates reach `toParent`.
- ~~**Plan 5: composed accuracy beyond 1σ, independent terms** (Task 7b,
  `pointAccuracy`). Confidence levels, correlated terms (two encoders on one
  shaft, a survey shared by two bases) and per-direction error ellipsoids.
  Today an angular term scales by the point's distance from the frame's
  origin, an upper bound, because a `FrameAccuracy` names no axis; a stated
  axis would give the exact lever (the distance to the axis).~~ Done (plan 5b, Task 4): confidence, shared sources, a stated axis, covariance and an error ellipsoid.
- **Plan 5: `accuracyOf` on `pointAccuracy`.** `accuracyOf` (measure)
  composes Earth orientation, ephemeris, trajectory and relativity terms on
  its own, apart from the edges' stated accuracy. The two agree on the ITRF
  edge only as an upper bound (`accuracyOf` scales UT1 by the distance from
  the spin axis). Rebuild `accuracyOf` on `pointAccuracy` once frames state
  every term (a trajectory's `positionSigma` as its frame's accuracy, the
  Moon's relativity term on its edge), and check the catalog's numbers move
  only where the bound tightens.
  (Task 7b's brief had `accuracyOf` move into `pointAccuracy`; deferred by
  ruling in its fix round 1. Already on `pointAccuracy`: earth-turns' answer
  and the frames explorer's walk wherever the route crosses an app-defined
  frame, which since the owner's follow-up of 2026-11-07 is every frame the
  example defines: Sacramento's site, the lunar site, the DSN dishes, the
  drone and the ship state their accuracy (`scenarios/stated.ts`). Still on
  `accuracyOf`: walks over built-in frames only, and each walk's part past
  its nearest built-in frame. Moving those needs a stated rotation axis in
  `FrameAccuracy` (UT1's lever is the distance from the spin axis) and
  frames that carry the terms on no edge. `accuracyOf` still gives a point
  on the Moon no lever for MOON_ME's orientation, and the library's MOON_ME
  still states none. The explorer covers it on its own side: it estimates
  MOON_ME at 3 × 10⁻⁷ rad, labelled "estimated, illustrative", and its walk
  adds that times a point's distance from the Moon's centre, so the lunar
  site walks to ITRF at ±0.52 m, not the ±3 cm `accuracyOf` alone gives.)

_Plan 5 design input: routing a design CRS into the frame tree (owner,
2026-11-07)._ Today an engineering frame relates its CRS to WGS 84
(EPSG:4979), and PROJ ranks the candidate operations by a stated accuracy that
the step to the WGS 84 ensemble dominates (1–2 m). For California zone 3 +
NAVD88 that made PROJ prefer GEOID99 plus NADCON5 (±1.14 m) over GEOID18
(±2.015 m), though GEOID18 is NGS's current model and the one an engineer's
data uses. Plan 4b pinned GEOID18 and ruled that a "better" candidate must
keep the same geoid. Plan 5 designs the routing properly:
_Plan 5b (Task 5) did part: the built-in edges state every term (the ephemeris edges' shared source, ITRF's UT1 and polar motion, MOON_ME's estimate as `MOON_ME_ORIENTATION_RADIANS`) and a trajectory's frame states its covariance. `accuracyOf` and the explorer's walk are not rebuilt on `separationAccuracy`; see "Frames 5b results"._

- **Route to the frame tree's own root, not to WGS 84.** Relate a design CRS
  to ITRF2020 at the frame's epoch, through the published transformation for
  its datum (for NAD83(2011), NGS's 14-parameter Helmert to ITRF2020; check
  `proj.db` carries it). Stated accuracies then describe the real chain at
  centimetre level, and comparing candidates means something.
- **Reasonable defaults, decided by the engine.** Per height system, prefer the
  current geoid model (GEOID18 for NAVD88, and so on). Per horizontal datum,
  prefer the published, time-dependent route to ITRF. Rank by stated accuracy
  only among candidates that agree on those. The defaults should be data (a
  small table the engine ships, with sources), not code paths.
- **Explicitly configurable through the API.** An application can name the
  geoid model, the datum route or a whole pinned pipeline per frame, and can
  read back which route was taken and why (`RecordedOperation`, and the
  skipped candidates with their reasons).

_Plan 5 design input: snapping on the GPU, and the client/server split
(owner, 2026-11-07)._ Mirror 1.x: `Scene#snap` is a client-side GPU snapping
pass (an offscreen pick render into an RGBA32F target whose pixels carry the
pick ID, an edge flag and eye-space depth; `Snapping.js`, `SnapFramebuffer.js`),
and `SnapService` / `IonSnapService` is the separable server side, which
refines a snap against the source design data from the client's element, test
point, camera and canvas size (`snapPoint`, `hitPoint`, heat, geometry type,
curve). Plan 4b ships the split with a CPU stand-in for the client side
(retained tile geometry) and the design globe's exact alignment snap standing
in for the server. Plan 5 replaces the stand-in with a GPU snap pass, which
handles occlusion and cost by construction.

_Upstream proposals, for the owner to take to the right people (owner,
2026-11-07)._ Prior-art research (2026-11-07) found that the design globe's
tileset declaration overlaps existing work for its CRS (`ESRI_crs` in 3D
Tiles 1.1; `EXT_geospatial_crs_source`, an open draft in the 3D Tiles 2.0
work, CesiumGS/glTF#131) and its body (`3DTILES_ellipsoid`; the 2.0 root
CRS). The declaration is renamed `BENTLEY_engineering_frame` and composes
with those. What is new, and worth proposing:

- **A placement mode on the source CRS (3D Tiles 2.0, #131):** one field,
  `"placement": "rigid" | "reprojected"`, saying whether content in a design
  CRS is meant to be placed rigidly at an anchor or reprojected vertex by
  vertex. Nothing in 3D Tiles, glTF or OGC can say "reprojected" today.
- **Alignments (3D Tiles, and possibly glTF):** horizontal and vertical
  alignment geometry (lines, arcs, clothoid spirals, grades, parabolic vertical
  curves, stationing) as tileset data, with segment kinds named after IFC
  4.3's `IfcAlignment`, so exact snapping and station-offset readouts work on
  streamed content. Ours is `BENTLEY_alignments`, beside the frame.
- **A declared coordinate operation (3D Tiles 2.0):** which operation the
  producer used to reproject, as WKT2 `COORDINATEOPERATION` or `BOUNDCRS`
  (standard) rather than a PROJ pipeline string, so a consumer can reproduce
  the producer's placement exactly, with a rule that every grid it names is a
  published, hashed grid.
- **A site transform mapped to IFC (3D Tiles 2.0):** our rotation, scale and
  origin match IFC 4.3's `IfcMapConversionScaled`; proposing that shape (or a
  reference to it) would let IFC-sourced tilesets carry it unchanged.
- **Deliberately not proposed:** the geoid fallback (EGM96 or EGM2008 when a
  national grid is missing), which is application policy, not tileset data.

_Plan 5 design input: animation, starting with camera transitions (owner,
2026-11-07)._ Flights between rigs need to be configurable: "an instant jump
vs a linear movement vs something eased in and out". This is the place to lay
groundwork for animation in general.

- **A small animation core, not camera-specific.** An animation animates a
  value over a timeline, with timing (duration, delay, easing) and playback
  controls (play, pause, reverse, playback rate, a `finished` promise), after
  the Web Animations API. Easing is a named preset, a cubic Bézier, a spring
  (which keeps its velocity when interrupted) or a function. Keyframed
  values use glTF's samplers (step, linear, cubic spline). The same core
  drives camera transitions, the design globe's placement morph, and later
  any animated property.
- **Every animation chooses its clock,** the wall clock or the scene clock
  (owner: "configurable between wall clock and scene clock for all
  animations").
- **A camera transition is a blend between two live rigs,** after Unity's
  Cinemachine: each frame evaluates the source and target rigs at the
  current time (so a moving target such as Orion is tracked throughout) and
  blends them by the eased weight in a common frame of the tree. A cut is
  duration 0.
- **Path and timing are separate.** The path is the route (straight in the
  blend frame, an arc over the surface as 1.x's `flyTo` does with its maximum
  height, or a spline); the easing maps time onto it.
- **Interruption is configurable per transition (owner, 2026-11-07),**
  with a default for user input: `stop` (the camera stays where it is, on
  the rig it was nearer to), `handover` (the transition's velocity carries
  into the user's drag, spring-style), or `finish` (input waits until the
  transition completes). Programmatic interruptions, such as a new
  transition starting, use the same policies.
- **Configurable at three levels:** per call, per pair of rig kinds (a
  Cinemachine-style table of defaults, such as "globe → ride-along: 3 s
  ease-in-out"), and app-wide.

_Terms (owner, 2026-11-07):_ a draw's **placement** is how its content
coordinates reach the render space, rigid (affine) or per vertex; the frames
module computes it from a **coordinate operation** (PROJ's and ISO 19111's
term), and applying one is **reprojection**. "Warp" and "deformation" are
avoided (the latter means crustal motion in geodesy, as in PROJ's `defmodel`),
as is "projection" for this (it is the camera's).

_Plan 5 design input: one flat render space, and frames above it (owner,
2026-11-07)._ This replaces the question of a default frame tree. "The
default frame tree that's needed for a scene is application dependent and we
don't need to load up a bunch of frame tree stuff for an app that's never
going to go into space."

- **The rendering core knows one flat space and nothing about frames:** a
  Cartesian render space in metres with no meaning attached, a transform per
  draw, and a camera pose in it. Precision stays camera-relative, so one core
  serves a site, the Earth and the Moon. The core's only frame-adjacent
  feature is that a draw has a **placement**: affine (a matrix) or per vertex,
  for content that is reprojected,
  flattened or morphing. Without the frames module, a draw's transform is a
  matrix the application sets.
- **The frames module is optional and sits above the core.** At each tick's
  time it resolves every frame in use into the render space and hands the
  core each draw's placement. The render space is one chosen frame, the
  **render root**: ITRF for the globe view, the engineering frame for design
  view (so design coordinates are straight axes, and the globe's tiles reach
  it flattened through the frame's projection), MOON_ME on the Moon. Design
  view is not a special mode, and the design-space morph blends two render
  roots.
- **Frames are built on demand, so an app pays for what it uses.** Providers
  load when a frame that needs them is first asked for: an ellipsoid-only
  Earth (the globe default); Earth orientation (IAU models, plus IERS data
  for precision) when GCRF is asked for; an ephemeris for the Moon or the
  Sun; PROJ for an engineering frame; a trajectory with its data. Whoever
  asks chooses the precision.
- **The Viewer picks defaults** (for a globe app: ITRF as the render root,
  the ellipsoid Earth, nothing else); applications on the lower-level APIs
  choose for themselves, or leave the module out.
- **A draw's placement is also where tessellation meets the coordinate
  operation:** the frames module knows each draw's placement into the render
  root, so subdividing reprojected geometry (see "tessellating reprojected models")
  can be driven from the same information.

_Design input after plan 5: one GPU tessellation engine, for reprojected models
and B-reps (owner, 2026-11-07)._ Rendering B-reps (trimmed NURBS and other
analytic surfaces from CAD) needs view-dependent tessellation too. A CPU
kernel such as SMLib may tessellate, but the engine wants it on the GPU. One
engine should serve both cases: evaluate surface patches (Bézier or NURBS)
and the draw's placement together in compute, subdivide by screen-space error,
handle trim curves (trim textures or signed distance fields), and draw with
indirect draws (WebGPU has neither tessellation nor mesh shaders). Prior art
to start from: Guthe et al.'s GPU trimming and tessellation of NURBS (2005),
feature-adaptive subdivision (OpenSubdiv), and direct ray-casting of trimmed
NURBS. Plan 5 only keeps the seam open: per-vertex placement and the frames
module's per-draw projection are what this engine would consume.

_Plan 5 design input: groundwork for post-V1 WebGPU features (owner,
2026-11-07)._ Apply the bindless pattern (§7.1: "design for it; don't build
it": one seam every caller goes through, plus a test that fails on any
bypass) to the features the WebGPU working group has tagged for after V1, so
adopting them later is a backend swap rather than a refactor. Only where the
seam costs nothing today; no design compromises in the current WebGPU path.

- **Ray queries and acceleration structures.** Every ray or spatial query
  (picking, snapping, line of sight, height queries, §13.16) goes through one
  query interface that names its frame and instant. Today it runs on CPU BVHs
  or compute traversal; a hardware ray-query backend drops in behind it.
  Acceleration-structure lifetime (build, refit, evict) hangs off tile and
  draw lifetime in streaming through one hook, so a per-tile BLAS and a
  per-frame TLAS have a place to live.
- **Mesh shaders.** Geometry reaches the GPU through the GPU-driven
  submission path only (§7, M1), and the content pipeline can carry
  meshlet or cluster data, consumed today by compute culling and indirect
  draws. A mesh-shader backend replaces the compute-plus-indirect stage, not
  the content format or the callers.
- **Multi-draw indirect, push constants (immediates), texel buffers and
  64-bit atomics:** per-draw constants and draw-argument buffers go through
  one seam each, so multi-draw indirect and immediates replace an emulation
  rather than call sites; 64-bit atomics would enable a visibility buffer or
  software rasterization later (§7.1's reassessment).
- **Subgroups and cooperative matrices:** keep the portable kernels with
  subgroup fast paths behind a capability check (§7.2), and extend the same
  rule to any matrix-unit work.
- **Multiple queues and async compute:** the job graph marks each pass's
  queue affinity and dependencies now, so async compute is a scheduling
  change.
- **Capability tiers:** one registry of probed features and limits (§13.15's
  tiers), read by every backend choice; Slang shaders are organized per
  capability, so a new stage (mesh, ray query) adds a module rather than
  editing every shader. Each seam gets a bypass test like
  `test/bindless.test.ts`.

_Plan 5 design input: modules with interfaces (owner, 2026-11-07)._ "We
should generally be thinking about how to make 2.0 more modular so pieces of
it can be reused and composed in interesting ways and we can easily plug
different module implementations in for places where that makes sense."
Plan 5's API review designs the seams:

- **Frame management as its own module,** behind interfaces to the core
  drawing code, so an application can include it, leave it out, or replace
  it, for example with a frame manager that isn't built on PROJ. Coordinate
  conversion becomes a service the module supplies (PROJ is one
  implementation). Placement takes a third mode beside rigid and
  reprojected: content that arrives already reprojected by its producer or
  host. Picking reports frame-tagged positions through an interface the
  module fills in.
- **Measurement and tools as their own module,** open source in this
  repository. 1.x keeps its measurement toolkit separate from the engine,
  and 2.0 does too: the core provides picks, design coordinates, accuracy
  terms and the frame tree; the module provides the tools and their UI. A
  host application can use it or bring its own.
- **Snapping** keeps the client/server split (plan 4b, Task 16): the client
  side is the core's, and the server side is a service any host can supply.
- **Later, after prototyping: the drawing layer's portability.** Whether
  drawing can be modularized enough to support WebGPU's compatibility mode,
  or a WebGL 2 backend. Not now: the owner wants no design compromises in
  the WebGPU approach while the prototype is built. Notes on the layers this
  would need are in §13.17.

_Plan 5 design input: tessellating reprojected models (owner, 2026-11-07)._ A
reprojected model's edges are straight chords between reprojected vertices,
so a large flat face (a runway slab, a panel row) sags below the curved
Earth by about d²/8R at its middle (2 cm for a 1 km edge, 2 m for 10 km),
and cuts through terrain. Plan 4b's generator subdivides faces at write time
until the sag is under the tile's geometric error. Plan 5 designs how the
engine handles models it didn't generate. WebGPU has no tessellation stage,
so the options are:

- compute-shader adaptive subdivision with indirect draws;
- per-vertex placement in the vertex shader, carrying design coordinates and applying the
  curvature correction per vertex, so the subdivision can be coarse;
- refinement driven by screen-space error, folded into tile selection;
- requiring producers to subdivide, and stating the rule in
  `BENTLEY_engineering_frame`.

_Plan 5 design input: clipping, beyond the first terrain clips (owner,
2026-11-07)._ "If using CWT ends up with the terrain poking through some of the
synthetic tilesets geometry we might need a quick clipping API for terrain,
probably just clipping rects or simple polygons to start and a note to think
more deeply about this later (like using vector tiles to specify clipping
boundaries)." The quick API is built: a globe's `addTerrainClip` takes a
rectangle or a simple polygon in geodetic degrees, at most 32 a world and
1,024 vertices each. Each region is packed into the world's clip-box buffer
and tested per fragment in the region's tangent plane, a gnomonic projection
from where its anchor's normal meets the polar axis. A grid over the plane,
refined until a cell lists at most about 8 edges, holds per cell a sample
point and whether it is inside, so a fragment tests only its cell's edges.
The CPU sets a bit per region in each globe tile's draw record for the tiles
the region touches (by its grid, so a long strip masks only the tiles it
crosses), and no region costs nothing. Picks, terrain rays and height
queries treat clipped terrain as a hole (`globe/terrainClip.ts`). Measured on
the MacBook Air at 1456×1360 (Cesium World Terrain, with other pages sharing
the GPU, so ±2 ms noise): four site regions in view cost about 1 to 2 ms, and
those with a 660-vertex, 50 km corridor strip about 4 ms. Most of it is in
the depth, prepass and shadow passes, which test every fragment of a touched
tile; the shading pass doesn't, since after the depth prepass a clipped
fragment can't equal the depth. The 0.1 ms the owner asked for isn't met.
Plan 5 designs the rest:

- **Clipping boundaries from vector tiles.** Site footprints, parcels and
  building outlines arrive as vector tiles, many more than 32 and with
  thousands of vertices. Per-tile region lists replace the 32-bit mask (a
  list per draw in the clip buffer), and the vector tile's own tiling can be
  the prefilter. A coverage mask rasterized per terrain tile (a texture slice
  like imagery's, composited from the vector tiles: inside, outside, or
  "edge here") makes most fragments one sample, however many regions and
  edges there are, with the exact edge test only in the mask's edge texels.
  That is also the way to the 0.1 ms budget: today every fragment of a
  touched tile projects into each region's plane.
- **Holes and nested regions.** Today a region is one simple ring. Polygons
  with holes (a courtyard left standing) and regions inside regions need
  even-odd or nonzero winding across rings, tested in one pass, and a CPU
  validator for rings that touch.
- **Inverse clipping: terrain only inside.** A site shown on its own (the
  terrain outside its boundary removed) is the same test inverted per globe,
  or per region with a flag. The CPU's prefilter then inverts as well: a tile
  wholly outside every region is dropped from selection, not drawn and
  discarded.
- **Clipping imagery and other content, not only terrain.** The record bit
  and the clip buffer don't care what draws: 3D Tiles (the existing
  buildings a design replaces), imagery layers (clip one layer, show the one
  under it), models and point clouds. 1.x has `ClippingPolygonCollection` on
  tilesets and the globe; 2.0 should have one clip collection that any
  content can reference. GPU ray casts (`World.castRays`) need the clip test
  too: today they still hit clipped terrain, and `raycast.slang` already
  binds the base tier's eight storage buffers, so the clip data has to share
  one of them.
- **Clipping in a frame other than the body's.** Regions are geodetic on the
  globe's body. A design's site boundary is in its engineering frame (a
  projected CRS, or a local grid), and its edges are straight there, not on
  the ellipsoid. Regions should be able to name a frame of the frame tree and
  be tested in it: the projection plane is already per region, so a region
  in a projected CRS is a different plane (that CRS's, linearized near the
  site), and a moving frame updates the region's anchor per frame.
- **Smaller things.** Edges are aliased: they discard per pixel, not per
  sample. Height clamping inside a clip stands on collision tilesets, or keeps
  its height. A clip can't be edited in place: changing one is remove then
  add, and dragging a vertex re-uploads the region.

_Plan 5 design input: camera rigs attached to frames (owner, 2026-11-06)._
Today every camera controller quietly assumes the Earth. `GlobeController`
works in Earth-fixed coordinates, constrains the camera to the ellipsoid, and
needs a pick under the cursor, so in space the only way to start a rotation is
to grab the Earth. `InspectController` takes "up" from the ellipsoid's
east-north-up at its target. The frames example's custom orbit "up" axis
(2026-11-06) is a stepping stone, not the design. Plan 5 designs this properly,
with a brainstorm first:

- **The camera rig belongs to a frame.** Its pose lives in a frame of the tree
  (ITRF, GCRF, MOON_ME, an engineering frame, a trajectory), resolved to world
  coordinates every frame at the clock's time. That choice decides what holds
  still: on MOON_ME the Moon stays put as time runs; on GCRF the Earth turns
  underneath; on a trajectory the camera rides along.
- **Inputs are expressed in the rig's frame.** The pivot is a point in it (a
  body centre, a site, a selected frame's origin). "Up" is one of its axes (a
  pole, an orbit normal, an engineering frame's up). Heading is measured from
  a reference axis in it (north, grid north, x).
- **The rig is only a pose in a frame (owner, 2026-11-07).** It holds no
  rules about where the camera may go. **Controllers own the constraints:**
  a globe controller may keep the camera above a body's surface (that body's
  ellipsoid or terrain, so the Moon's on the Moon) or let it go under;
  free-fly has only a range limit. Underground visualization is a first-class
  case, so no constraint lives anywhere a controller can't turn it off
  (seeing underground, such as translucent terrain, is the renderer's).
- **The rig splits position from orientation (owner, 2026-11-07),** after
  Cinemachine's Body and Aim, so any follow behaviour is expressible and the
  user chooses it:
  - **position:** an anchor (a frame's origin, such as Orion's), an offset,
    and the frame the offset is expressed in;
  - **orientation:** a frame whose axes the camera's up and forward follow,
    or an aim (look at a target, with an up vector taken from a frame);
  - **damping,** optional, per part.

  Every orientation choice is a frame in the tree, built with SPICE's
  **two-vector dynamic frames** (a primary axis along one vector, a secondary
  toward another, re-evaluated over time): a cockpit view is the target's body
  frame; an orbital view is primary up from the central body, secondary along
  the velocity (local vertical, local horizontal); a stars-fixed view is a
  constant frame captured in GCRF when the rig attaches; a level-horizon
  follow is primary the target's forward axis, secondary up from the central
  body. Named presets (`"cockpit"`, `"orbital"`, `"inertial"`) sit on top of
  the generic form. Two-vector frames are a frame-tree feature in their own
  right (antenna pointing, sun-relative frames), not just a camera one.

- **Controllers are policies over the rig.** The globe controls are a rig on
  ITRF with Earth's ellipsoid and grab-the-surface input. Orbit is a pivot
  plus an up axis. Free-fly can join them.
- **A CAD-style controller for design space (owner, 2026-11-07),** with
  orbit about the point under the cursor, pan, zoom to the cursor, and
  animated standard views (top, front, side, isometric). The camera API
  offers `fitBounds(bounds)`; what to fit (a selection, a model's extents)
  is the application's. Orthographic or perspective is the camera's
  projection, not the controller's. Section and clip planes are the
  renderer's and the application's.
- **Gestures are bindings, not subclasses (owner, 2026-11-07).** One gesture
  set works the same on the globe and in design space by default, and a host
  can change it without writing a controller:
  - **actions:** the controller's named operations (orbit, pan, zoom, look,
    tilt, roll, fly forward, frame selection, the standard views), each done
    once by the controller;
  - **bindings:** a plain, serializable map from input to action, such as
    `{ "drag:left": "orbit", "drag:middle": "pan", "wheel": "zoom" }`,
    covering mouse, touch and keys; a host passes a whole map or merges
    overrides into a preset;
  - **presets,** after Blender's "Blender" and "Industry Compatible"
    keymaps: 2.0's default, and CAD-style sets;
  - **custom actions:** a host registers a function over the rig and binds
    it like any other;
  - **full replacement** stays possible, because a controller is an
    interface.
- **Flights between rigs need a defined hand-off,** for example the Earth to
  a lunar site: interpolate in a common frame, then re-attach.
- **The sky follows what the rig is attached to (owner, 2026-11-06).** Today
  the Earth's sunrise and sunset sky colours still show while the camera
  orbits in space, as in the frames example's orbit scenes. The sky and
  atmosphere should come from the rig's body and the camera's place relative
  to it:
  - inside or near a body's atmosphere, that body's sky scattering;
  - in orbit, black space, with the atmosphere drawn only as a shell on the
    body's limb;
  - on the Moon, no atmosphere at all.

  **Physically, not by blending (owner, 2026-11-07):** "physically correct as
  the camera transitions between frames in the same way that zooming out of
  earth right now shows the atmosphere accurately … a general system there
  rather than naive blending." Every body declares its atmosphere, or none.
  Each atmosphere is evaluated from the camera's true position relative to
  that body, in the body's own frame, whatever frame the rig is attached to,
  and what is seen through each is composited physically (the Moon seen
  through Earth's air from the ground; Earth's limb shell against black sky
  from the Moon). The frames example's orbit scenes showing Earth's sunrise
  colours in space are a bug in how the camera's position reaches the
  atmosphere, not a missing blend.

**Design space and the global view, with a morph between them (owner,
2026-11-06).** An engineering model, such as an iModel in its design CRS,
needs two ways to be seen:

- **In isolation, in its native design space.** The render frame is the
  engineering frame: design E, N and up as straight axes, in design units.
  Straight design lines draw straight. Nothing is projected, and picking
  reports design coordinates.
- **In the global view.** The same model is drawn Earth-fixed and reprojected
  through its recorded operation (4b's reprojected placement). It warps to fit
  the ellipsoid, so design lines curve and grid north leans by the
  convergence.

A camera transition between the two morphs the content. The model warps from
flat to fitted as the camera pulls out, and the terrain and imagery tiles
under it start laid out flat in the design CRS and curve down onto the globe.

- **Prior art:** CesiumJS 1.x's scene morph between 3D, Columbus view and 2D.
  Columbus view is a flat projected world, and the morph animates each vertex
  between its projected and 3D positions with a blend parameter. Here the
  "flat" projection is the model's design CRS, not a fixed map projection.
- **Per-vertex dual positions, or a GPU-side projection.** Each vertex needs
  a design-space and an Earth-fixed position. Content has both. Terrain and
  imagery tiles need their design-space positions too. PROJ per vertex is
  too slow, so fit the projection per tile (affine or low-order polynomial),
  with a stated error bound. The accuracy display (frames example R8) says
  what the fit costs.
- **What the camera does:** the rig's frame (above) changes from the
  engineering frame to the Earth-fixed one across the morph. Heading follows
  grid north at one end and true north at the other.
- **Links:** 4b's rigid and reprojected placements are the two end states.
  The frames example's rigid-vs-exact stop and its design grid with true
  north are small versions of this picture.

**The default frame tree: a catalog, and a tree in use (owner, 2026-11-06).**
The frames example's scenarios showed the question: every scenario's tree
started from the full built-in set, so "The Earth turns" drew HCRS, EME2000
and the Moon's frames it never used. Two things are mixed up in "the default
tree". Plan 5 should separate them:

- **The catalog** is every frame the library knows by name, each defined by a
  published convention: ICRF, GCRF, ITRF, EME2000, HCRS, EARTH_ICRF and
  MOON_ICRF/ME/PA, then TEME, ecliptic frames and other bodies. It is always
  addressable and costs nothing until something uses a frame.
  - **Prior art:** Orekit's `FramesFactory` builds well-known frames lazily.
    SPICE has every built-in frame but fails clearly when a frame's kernel
    isn't loaded.
- **The tree in use** is the frames the scene touches, plus their ancestors.
  This is what a diagram shows, and what a scenario builds. "The Earth turns"
  is then ICRF → GCRF → ITRF → its site frame, and nothing else.
- **Data loads with first use, not with the catalog.** ITRF needs EOP, the
  Earth and Moon branches need DE440, and MOON_ME needs the lunar PCK. A
  globe-only app shouldn't fetch an ephemeris because the catalog lists the
  Moon.
- **A stand-in model declares its accuracy.** A frame can work before its data
  arrives on an analytic stand-in, but the edge then states the stand-in's
  wider accuracy and visibly changes when the real data loads. Otherwise the
  frame is unavailable until its data loads. Choose per frame, never silently.
  The cautionary tale: the sky Moon on Simon 1994 put the lunar pole triad
  404 km off with nothing saying so (fixed by `setFrameData`).
- **The renderer's own use counts as use.** A plain globe touches GCRF for the
  sky and the sun, and MOON_ICRF/ME for the Moon disk. A diagram shows these
  dimmed, as "used by the sky", so the tree is honest without implying the
  scene added them.
- **The root:** keep ICRF (barycentric), so a lunar site and a ship meet at a
  common ancestor. Run the Earth branch on a declared stand-in until DE440
  loads, so a globe-only app never waits for it. Orekit roots at GCRF to avoid
  that dependency; the stand-in removes the reason.

**Accuracy along a route: declared per edge, composed by the library (owner,
2026-11-06).** "Seems easy for a user to screw up." The rule: the app
declares each edge's error in its own terms (an angle for an encoder or Earth
orientation, metres for a link tolerance, a survey or an ephemeris, exact by
definition, or not stated), and the library composes it for a point along the
route. The frames example's Task 7b lands the first-order version: an optional
`accuracy` on `Frame`, and `pointAccuracy`, which scales angular terms by
their lever arms, adds metre terms, combines them root-sum-square, names the
dominant term, and propagates "not stated" by name. Plan 5 designs the rest:

- **Confidence is declared, and never mixed silently.** Each edge says whether
  it gives 1σ, a 95% bound or a hard maximum. The composer converts where a
  distribution is stated, and refuses to combine otherwise, saying why.
- **Correlated terms.** An edge whose error is systematic, or two edges that
  share one error source (the same encoder model, the same EOP table), add
  linearly rather than root-sum-square. The declaration needs a way to say so.
- **Per-direction error.** First-order radii are fine for small angles. Full
  covariance through each edge's Jacobian gives an error ellipsoid at the
  point, and shows that an encoder error is across-track, not along it.
- **Time-varying accuracy.** Some edges, like predicted Earth orientation,
  degrade with age. The query takes the instant, and the breakdown says when a
  term is a prediction.
- **Where it surfaces:** picking, measurement and the frames diagram all report
  the composed accuracy with its breakdown, so "±1.8 mm, mostly the shoulder
  encoder" is something any app gets, not something the example computes.

**When the frame tree is rebuilt, and what needs to be async (owner,
2026-11-06; revised after measuring).** The frames example hitched about once
a second while its clock played. The first suspect was the once-a-second
tree rebuild, which prompted the owner's question about an async API "so they
can be spread across multiple frames like other stuff in the engine".
Measuring showed the rebuild takes 0.4 ms. The real cost was every consumer
(the whole React panel, about 117k elements a second) redrawing every frame,
whether or not anything had changed (Task 4d of the frames-explorer scenarios
plan). The owner, on seeing that: "if rebuilding the frame tree is that fast
we probably don't need the async API". So:

- **The tree and single queries stay synchronous.** Building or rebuilding a
  tree, and one transform or one point at an instant, cost microseconds to
  well under a millisecond. Making them async would add API cost for nothing.
- **Change tracking is the lesson.** Each frame carries a revision, which goes
  up when its placement's inputs change: a joint angle, a newly loaded kernel,
  a new EOP table, a revised edge accuracy. Consumers (diagrams, overlays,
  labels, statements) key their work on the revisions along their route and
  skip it when nothing moved. This is also the "change signal" gap that the
  example's robot-arm task records.
- **Time-dependent values publish on change.** An edge whose accuracy drifts
  with time, such as predicted EOP, publishes a new value only when it
  changes by a visible amount. Only its own consumers update.
- **Bulk work only, if anything, gets an async shape.** Sampling a long
  trajectory into a mesh, accuracy statements over many samples, proof checks
  and PROJ batches are genuinely heavy, and today they run in the example's
  worker. Plan 5 decides only whether the library offers them as cancellable
  (`AbortSignal`), progress-reporting operations that run in a worker or
  under the engine's per-frame budget. That is a question about bulk
  operations, not about the frame tree.

**Ray queries through the frame tree (owner, 2026-11-06).** Ray queries
(§13.10) assume one Earth-fixed world today. Plan 5 makes them frame-aware:

- **Rays in a frame.** A ray is given in some frame at an instant (a dish's
  ENU, a drone camera's mount, a robot tool, a lunar site), and the library
  carries it through the tree to each target's frame. It doesn't assume
  Earth-fixed metres.
- **Targets in their own frames.** Terrain and tilesets belong to a body
  frame: Earth terrain in ITRF, the Moon's terrain and imagery in MOON_ME,
  and an iModel in its design space or placed through its CRS. Moving bodies
  (a ship, a drone, a spacecraft) carry their geometry in their body frames.
  A query transforms the ray into each target's frame, not every target into
  one world.
- **Time.** Each target is placed at the query's instant. Across long
  distances, light time can matter: Earth to Orion, or Earth to the Moon. The
  query states whether it is geometric or light-time corrected, as
  `lineOfSight` does.
- **Precision.** Rays and hits stay float64 on the CPU. GPU rays use the same
  hi/lo, camera-relative origins as the rasterizer, and hits are reported in
  the frame the caller asked for.
- **Accuracy.** A hit's position carries the composed accuracy of the route
  from the ray's frame to the target's frame, through `pointAccuracy`, plus
  the target geometry's own accuracy.
- **Links:** the frames example's terrain line of sight (Task 5b) is the
  Earth-only first step; the dish, ship, drone, robot-arm and "Everything at
  once" scenarios are the use cases; frame-tagged picking (plan 3 R8) is the
  same question for the cursor.

**A public API review (owner, 2026-11-06).** Plan 5 is also the time to
look at the public API as a whole. Decide what belongs on which side of it,
based on what has been built on top of the engine so far: the frames
explorer, the realtime-tracks example, the Viewer widgets, the stress catalog
and the bench. The review has two outputs: a map of today's surface, and
proposed moves. Questions to answer:

- **Promote.** What did the examples have to build themselves that every app
  will need? Candidates from the frames explorer:
  - the accuracy types and their composition (`EdgeAccuracy`, `accuracyOf`,
    which Task 7b is already moving);
  - `branchPath` and the tree model;
  - app-defined frames with their accuracy;
  - point placement for labels and markers;
  - camera rigs and orbit controls;
  - the stale-answer and generation patterns around async work.
- **Demote.** What is exported only because an example reaches into it, or
  exposes internals (stress-context getters, renderer state the examples
  poke)?
- **Shape.** Check the API's consistency: sync versus async, `AbortSignal`
  everywhere work can be cancelled, `dispose` lifetimes, events or
  subscriptions versus polling, units and frames named in types, and errors
  that say what to do.
- **Stability tiers.** Which parts are stable and which are experimental, how
  that is marked, and what the examples are allowed to import, given that
  the examples are documentation. Bundle size and tree-shaking follow from
  this split. The Viewer's `skyState` import, carried forward above, is one
  case.

Camera rigs and render frames are one question from two sides: plan 5 is also
where the world stops being drawn Earth-fixed (R6 of plans 2 and 3), so
design them together. Open choices for the brainstorm: what holds still by
default, how flights cross frames, how input maps onto a rolled frame, and
how picking reports positions in the rig's frame (frame-tagged picking, plan
3 R8).

_Carried forward from the stress-test example's industry review (owner,
2026-11-06)._ These library gaps came up while planning the frames example's
stress tests. The example can't test them until the library has them.

- **Plan 5 or a frames add-on: TEME and SGP4.** Satellite operators publish
  orbits as two-line element sets. These are propagated with SGP4 in the
  TEME frame. Neither is in the frame tree. Add TEME under GCRF, with its
  equation-of-the-equinoxes rotation, and add an SGP4 trajectory source.
- **Later: rail alignments.** Rail chainage crosses station equations
  ("station back = station ahead"), and rail uses non-clothoid transitions:
  Bloss, cubic parabola and sine half-wave. `Alignment` has neither.
- ~~**Plan 4b: tidal and chart datums.**~~ Done where PROJ-data has grids
  (plan 4b, Task 7): depth axes (`verticalDirection`), and Denmark's
  DKLAT(2023) tested. Hydrography and coastal work use lowest astronomical
  tide and mean lower low water (as in NOAA's VDatum). NOAA's surfaces
  aren't in PROJ-data; hosting them is held for the owner.
- **Later: grid references and accuracy reporting.** MGRS and the US
  National Grid aren't in PROJ, and defense and emergency response use both.
  Accuracy statements also need a CE90/LE90 form: 90% horizontal and
  vertical error.

_Watch: lunar reference systems (checked 2026-11-06)._ No lunar 3D CRS or
height system is standardized yet.

- **CRS codes.** PROJ's IAU 2015 lunar codes and Esri's (for example
  ESRI:104903, "GCS_Moon_2000") are 2D: latitude and longitude on the
  1,737,400 m IAU sphere.
- **Height convention.** The USGS lunar data standard measures height above
  that sphere. The engineering frames do the same: PROJ does the horizontal
  projection, height passes through, and `MOON`'s sphere gives body-fixed
  coordinates.
- **What to check before building on the Moon** (plan 5, or any lunar
  engineering frame):
  - **NASA's LunaNet Lunar Reference System Standard (LNIS-TBD-3011).** It was
    scheduled for a public v1 in November 2026 (IOAG/ICG Cislunar 2026
    workshop slides). Its release was unconfirmed on 2026-11-06.
  - **The International Lunar Reference System** and its first realization,
    ILuRF2026 (arXiv 2510.15484 and 2607.27762; A&A 2026, INPOP-based
    realizations). It is built from combined lunar ephemerides, with the
    origin at the Moon's center of mass and published as a time series from
    1970 to 2050. When it is adopted, add it to the frame tree beside
    MOON_ME and MOON_PA, built from that series.
  - **The IAG/IAU Joint Working Group 1.1.3 height system** (lunar frames,
    time and heights). A lunar geoid will most likely ship as a grid. It plugs
    in like NAVD88 does on Earth: through an engineering frame's pinned PROJ
    pipeline with a vertical grid step, which plan 4a supports.

**Frames explorer scenarios: results (2026-11-07).** The explorer now opens on
eleven scenarios instead of a tour and a test report
(docs/superpowers/specs/2026-11-06-frames-explorer-scenarios-design.md, plan
docs/superpowers/plans/2026-11-06-frames-explorer-scenarios.md). Each one
builds its own frame tree, answers one question on the globe, says how sure it
is, and shows how that is checked. The stress catalog is still there, behind
the Verification tab.

- **The scenarios and their trees.**
  - **One path, three frames:** how fast is Orion going? GCRF, ITRF and
    MOON_ME, with Orion's OEM.
  - **The Earth turns:** where is Greenwich pointing, against the stars?
    ITRF under GCRF, with measured Earth orientation.
  - **Where's the Moon from here?** Its direction and distance from
    Sacramento, through the site's ENU frame, checked against JPL Horizons.
  - **Stand on the Moon:** how fast does a clock run at a lunar site?
    MOON_ME, MOON_PA and the site's ENU frame.
  - **A dish tracks Orion:** light time and pointing from DSS-43, with the
    DSN horizon masks.
  - **A BIM site on the globe:** a site grid under a design CRS (rotation and
    scale), at San Francisco or Portland.
  - **Survey a corridor:** station and offset on a design alignment.
  - **A drone over the site:** what the camera is looking at on the design
    grid. The drone and camera mount are app-defined frames from a track.
  - **A ship enters San Francisco Bay:** its position on California zone 3,
    and whether the mast sensor's sight line to Harding Rock's buoy clears
    the headland.
  - **A robot arm on the pad:** a joint chain on LC-39A, tied to NGS mark
    AK1155 and checked against survey mark CCV6.
  - **Everything at once:** any two objects from the other scenarios, with
    the route between them through the meeting frame. The checked pair is
    DSS-43 ← Orion.
- **The proof model.** Each check has a kind: published reference, measured
  data, hand formula, round trip or live re-run. Only measured rows may say
  "validated". Each scenario has a checked setup. Off it, the reference rows
  say they apply at the checked setup, and the round trips and live rows
  re-run at your setting. The answer's accuracy comes from the frames' stated
  accuracy (`Frame.accuracy`, `pointAccuracy` and `dominantTerm`, new in
  this plan), up to the nearest built-in frame, then from the example's
  accuracy composer beyond it, combined root-sum-square. A failed evaluation
  shows its error with Retry, and no figure from an earlier setting.
- **Terrain line of sight.** `terrainLineOfSight` now returns the deciding
  margin (clearance, error, position). The explorer never says "clear"
  inside the terrain's error band, or without a bound. Over undrawn or coarse
  terrain it says "can't tell yet". The drone gives a spot only when the ray
  before the hit is drawn and clear.
- **Data sources.**
  - **The ship's track is synthetic,** along the 33 CFR 167.400 inbound lane.
    No AIS extract is used.
  - **Harding Rock's buoy** is from a YRA compilation that cites the USCG
    Light List; the Light List itself returned 403.
  - **The robot arm's pad** is at NGS mark AK1155, carried through PROJ to
    ITRF2020 at epoch 2026.0 with CCV6's velocity. **CCV6** (PID DI3564)
    comes from NGS's NAD83(2011)↔ITRF2020 values on the NODD S3 bucket.
  - **The DSN masks** are the published receive masks (DSN 810-005, module
    301).
  - **Orion's OEM** is NASA's Artemis II ephemeris, as in plan 3.
- **Screenshots.** Task 9 took about 150 of them: every scenario in both
  themes at 1440 and 380 px, the checks on and off the checked setup, the
  Expand dialog, and the failure state. They're in the plan's workspace and
  not committed (owner, 2026-11-06).
- **Gates.**
  - `npm test`: 1,365 pass.
  - `npm run test:data`: 295 pass. `fingerprints.json` only gains two
    entries (`reference-values.ngs-di3564.itrf2020` and
    `rigid-placement-budget.site-gap.drop`).
  - tsc and eslint are clean, and `npm run build` builds.
  - `snyk_code_scan` finds 0 issues in the example and `widgets`. In `src`
    it finds only the accepted CWE-23 in `proj.ts`, which predates this plan.
  - The browser checks pass: Review Focus 1–5, keyboard-only use, reduced
    motion, the console, and the token search.

_Carried forward from the frames explorer scenarios plan._ These are deferred
items that are real work. The wording and test-strength nits the reviews raised
are left out.

- **Renderer / engine: GPU labels and wide polylines for the example's HUD.**
  The labels are DOM elements positioned each frame, and the overlay lines are
  1-pixel lists. Port them to the vector renderer's GPU labels (with a
  decluttering compute pass) and to wide polylines when those land. Keep the
  precision lesson from the jitter fix (labels and markers far from the Earth)
  as a vector-renderer test. The globe's labels can still collide.
- **Plan 5: a GPU viewshed.** The drone's viewshed overlay isn't built,
  because the CPU trace can't meet its 50 ms budget.
- **Plan 5: the Moon as a tileset.** In Earth views, the Moon is a backdrop
  body, and the scenarios say so.
- **Plan 5 / §13.16: a near-field bounded terrain trace.** Trace 20–50 km
  round each end with tiles at a level chosen for the error, whatever the
  camera is doing. Today a sight line takes the error of the tiles the
  camera happened to load. That is why the ship's lighthouse reads "in
  sight" at the checked setup only where the Gate is drawn at level 13 (a
  desktop canvas, once the tiles load; the scene's camera was moved close
  for it) and "can't tell" where coarser tiles stand in (the buoy it
  replaced always did), why the drone often reads "can't tell yet", and why
  an Earth end in the capstone says "not judged from this far out".
- **Plan 5 / §13.16: a per-tile terrain error over open water,** or a
  quantized-mesh water mask. The level-wide error overstates the error over
  flat sea many times over.
- **Plan 5: one ENU convention.** Body frames take "up" at their foot;
  `eastNorthUpFrame` takes it at the point (about 0.13 µrad apart at 250 m).
  Pick one and document it.
- **Plan 5: move the example's `accuracyOf` onto `pointAccuracy`.** Partly
  done (the owner's follow-up, 2026-11-07): every frame the example defines
  states its accuracy (`scenarios/stated.ts`: published where a source gives
  one, DSN 810-005 for the dishes; estimated and labelled for the drone and
  the ship; exact by definition for a chosen site or a knob's value), the
  walk composes those with `pointAccuracy` up to the nearest built-in frame,
  and each answer carries its app-defined ends at the walk's figure (a data
  test holds them). What remains: the built-in part of every walk, from
  that frame on, is still `accuracyOf` (through `measure`). Moving it needs
  a stated rotation axis on each frame, a home for terms that sit on no edge
  (light time, relativity), and a trajectory's covariance as its frame's
  accuracy (Orion's), and it will move catalog numbers. MOON_ME's
  orientation now has its lever at a point on the Moon in the explorer's
  walk, from an estimate that lives in the explorer (3 × 10⁻⁷ rad,
  `scenarios/stated.ts`), not in the library: the library's MOON_ME still
  states none, and `accuracyOf` still has no lever term for it. That, and a
  published figure to replace the estimate, remain. _Plan 5b (Task 5) did part: the built-in edges state every term (the ephemeris edges' shared source, ITRF's UT1 and polar motion, MOON_ME's estimate as `MOON_ME_ORIENTATION_RADIANS`) and a trajectory's frame states its covariance. `accuracyOf` and the explorer's walk are not rebuilt on `separationAccuracy`; see "Frames 5b results"._
- **Plan 5: the API review of this plan's library additions.**
  - Whether `LEVEL_ZERO_ERROR` stays exported (it was exported for the test
    hill).
  - `castTerrainRay` and five terrain tile types became public alongside
    `terrainLineOfSight`.
  - Some production modules export test-only helpers.
  - `Trajectory.velocitySigma` is new.
- **Example: the coarse-terrain guard applies only to the capstone.** The
  "not judged from this far out" rule, for an end whose terrain error is
  above `COARSE_TERRAIN_METERS`, belongs in the shared line-of-sight text, so
  every scenario's trace gets it.
- ~~**Plan 4b: the chart datum (MLLW).**~~ Folded (plan 4b, Task 7): MLLW
  depth (EPSG:5866) is reported as unavailable, naming it, because PROJ-data
  has no grid for it. The ship's heights stay NAVD88, and the answer says
  that charts use MLLW.
- **Library: widgets expose their occluders** (`occluders()` or
  `data-occludes`) instead of the example matching Dyno class names in
  `labelPanels.ts`. The credits and the time bar also overlap (a z-index fix
  in `widgets/credits.ts` and `timeControls.ts`).
- **Example: split the older files over 800 lines** (`overlays.ts`, `host.ts`,
  `globe.ts`, `stress/runner.ts`) when they are next changed.
- **Example: tag overlay frame requests by scenario,** so the first frames
  after a switch aren't evicted and rebuilt.
- **Example: the worker returns path sample times,** so Orion's dot sits at
  the clock's time.
- **Example: panel boxes from a ResizeObserver** instead of a
  `querySelectorAll` each frame.
- **Example: the terrain scan's `cancel()` resets `waitingSince`,** and its
  first slice on cold tiles takes about 30 ms.
- **Example: the tree diagram's keyboard and fit.**
  - Every edge is its own Tab stop (19 in the capstone); a roving tabindex
    would make it one.
  - The route row's "can't both fit" test looks only at width.
  - The "Checks ↓" pill can cover the tree.
- **Example: the route steps show PROJ's pipeline as a wall of text.** Show
  the operation's name, and put the pipeline behind a disclosure.
- **Example: the notation test** covers answers and check rows, but not route
  steps or globe labels.
- **Example: knob and answer precision differ** for the same quantity, and
  "Run all again" shows before a full run has happened.
- **Example: whether the tree's key should keep the "added" versus "your app"
  distinction** (owner's call).
- **Example: "Show source" shows only `main.ts`** (later gallery work).
- **Data: spot-check the DSN masks** against a fresh download of the
  spreadsheet.
- **Data: check the buoy's position against the USCG Light List.** It came
  from a third-party compilation. Fixing it is one constant.
- **Dyno: the shell overflows at a 380 px viewport.** See the resizable side
  column item above.
- ~~**Dyno (security): `npm run build` inlines `VITE_ION_TOKEN`**~~ Done
  (`d2cca2f34a`, the ion token setting): production builds contain the token
  in 0 files. It was inlined into 10 bundles.
- **Bisect gap:** `de5a508f52` doesn't type-check on its own; the next commit
  fixes it.

**Frames 4b results (2026-11-07).** Plan 4b
(docs/superpowers/plans/2026-11-07-frames-4b-placement-and-geoids.md) places
long design models on the globe rigidly or reprojected per vertex, picks and
snaps on them in design coordinates, and measures in design and true terms, in
any country's height system. Grids are fetched lazily and checked against a
pinned PROJ-data catalog. The library work is in `src/engineering/` (grids,
`EngineeringFrame.load`, structured pipelines, geoid fallbacks, depth axes,
`TilesetPlacement`, the tileset declaration, `pickDesign` and snapping),
`src/measure/` (the `pick` and `geoidFallback` terms and two warnings) and
`src/streaming/` (`Tileset3D`'s declaration, placement and retained geometry).
The §8.1 example is the new gallery page `examples/design-globe/`, with a
generator in `scripts/designTiles*` that setup runs. The README documents the
API.

- **Round trips** (design to displayed to design):
  - the corridor's tilesets, over 4,617 vertices (every 50th of every leaf):
    rigid 2.9 × 10⁻⁹ m, reprojected 1.5 × 10⁻⁵ m, against 10⁻⁴ m;
  - the site-grid building in the explorer's tileset-placement group: a rigid
    placement's inverse of its own forward is 8.2 × 10⁻¹⁰ m, against 4 ULPs
    of an Earth-radius coordinate (about 3.7 × 10⁻⁹ m), and reprojected
    3.0 × 10⁻⁹ m;
  - every leaf vertex of the seven ladder sites, both placements: within
    10⁻⁴ m. Each pair of tilesets draws the same design point per vertex.
- **Rigid sag on the corridor,** from `answers.json`: 7.955 m and 8.053 m at
  the stations nearest 10 km from the anchor (one on each side; the spec says
  7.8 m ± 1.5 m), 31.645 m at 20 km (31 m ± 3 m), and 34.08 m at the far end,
  20.76 km away. Task 10's test on plan 4a's California frame reads 7.80 m and
  31.16 m. The site-grid building's sag 20 km along its x axis is 31.199 m,
  and a hand formula that includes GEOID18's rise agrees within 0.089 mm.
- **Geoid cases against their publishers** (Task 9; each tolerance is the
  publisher's stated precision):
  - Ordnance Survey, OSTN15 and OSGM15, 28 points: worst 7.4 mm horizontal
    and 2.0 mm in height, within 1 cm;
  - NSGI, RDNAPTRANS2018, 15 points: 0.098 mm, within 1 mm;
  - Geoscience Australia, AUSGeoid2020, 6 grid nodes: 0.0018 mm, within 1 mm;
  - GSI, JPGEO2024 and GSIGEO2011, 7 points each: 0.047 mm and 0.050 mm,
    within 0.1 mm;
  - NGS, GEOID18, 8 grid nodes: 0.40 mm, within 1 mm;
  - NGA, EGM2008, 4 points from NGA's archived test output: 9.92 mm, within
    1 cm (the margin is thin: PROJ's bilinear against NGA's interpolation);
  - EGM96 has no reference: NGA's test values are spline-interpolated, and NGA
    states no precision for interpolating the grid.

  GA and NGS are checked at grid nodes, because their calculators don't
  interpolate bilinearly between them (1 to 2 mm off the nodes).

- **NGS mark HS5109 (GOLD CREEK) against PROJ.** PROJ's California zone 3,
  through the corridor's own operation, gives the datasheet's easting to
  0.0016 ftUS and its northing to 0.0051 ftUS, within 0.00664 ftUS (the
  datasheet's millimetre rounding converted to feet, plus its 0.005). Its
  body-fixed position matches the datasheet's X, Y, Z within 0.6 mm. The
  page's distance from the mark to the centreline is 501.188 ftUS against
  501.193 ftUS from NGS's own zone 3 values, within 0.0094 ftUS.
- **Snapping.** An exact snap on the alignment lands on the analytic geometry
  within 10⁻¹⁰ ft in the browser (the check allows 10⁻⁶ design units). The
  10,000 ft pair measures 10,000.000 ftUS horizontal, 10,001.9998 ftUS in 3D
  and 3,048.8485 m true, equal to the answers. A client snap to a barrier
  edge was within 1.1 × 10⁻⁸ m of the analytic barrier top, and a surface
  fallback 8 mm off, inside its stated ±77 mm. A client snap over a
  200,000-vertex draw takes about 3 ms.
- **The opening measurements.** Station 1700+00 against its own true position
  reads 30.586 m when rigid and 0.000 m reprojected. The mark leads with its
  live rigid offset, 19.278 m, and 0.000 m reprojected.
- **The scale ladder's rigid error at each model's edge,** with its parts
  (curvature d²/2R, the scale factor rigid ignores, and the geoid's rise):

  | Site      | Model      | Error at the edge  | Mostly              |
  | --------- | ---------- | ------------------ | ------------------- |
  | Amsterdam | building   | 2.56 mm at 30 m    | the scale factor    |
  | Tokyo     | city block | 69.1 mm at 489 m   | the scale factor    |
  | Jakarta   | port       | 0.293 m at 1.52 km | curvature and scale |
  | Sydney    | airport    | 0.390 m at 1.99 km | curvature           |
  | Phoenix   | solar farm | 0.474 m at 2.00 km | curvature and scale |
  | Nairobi   | campus     | 2.04 m at 5.07 km  | curvature           |
  | London    | pole line  | 18.34 m at 15.4 km | curvature           |

  The three parts predict every measured error within 3.7%.

- **Gates.**
  - `npm test`: 2,046 pass. `npm run test:data`: 457 pass and 1 skipped
    (EGM96's missing reference).
  - The frames explorer: 240 results unchanged, 251 in all; `fingerprints.json`
    only gains 8 keys.
  - Both tsc configs, eslint and prettier are clean, and `npm run build` and
    `npm run build:lib` build. Eslint needed one fix: it now ignores
    `packages/next/dist/` and `dist-lib/` (flat config doesn't read
    `.gitignore`).
  - `snyk_code_scan` finds 0 issues in `src/engineering`, `src/streaming`,
    `src/measure`, `src/io`, `src/scene`, `examples/design-globe` and
    `widgets`. Every finding elsewhere predates the plan: in `scripts/`,
    three Low CWE-23 in `erfaTables.mjs`, `leapTable.mjs` and
    `frameFixtures.py`; in `vite.config.ts`, the five the frames example carried forward;
    in `bench/suite`, seven (below); in `test/projGrids.test.ts`, two Low
    CWE-319 on its loopback servers, accepted. The CWE-23 in `proj.ts` that
    plan 4a accepted no longer appears.
  - Browser checks on the final page: the design globe loads with no console
    errors, the corridor's "Rigid's error at the edge" row reads "curvature
    33.8 m, the scale factor 2.3 m, the geoid's rise −159 mm", and Copy link
    with a real click says "Link copied".

Calls made, one line each (the plan lists all 23 with their undo costs):

- **GEOID18 pinned (owner).** The corridor, its building and Phoenix pin
  GEOID18's operation, because PROJ ranks NADCON5 with GEOID99 (±1.14 m)
  ahead of it (±2.015 m). A pin that matches a PROJ candidate keeps that
  candidate's stated accuracy.
- **The "better operation" rule (owner).** A skipped candidate is better only
  if it isn't a ballpark, states a strictly smaller accuracy and reads the
  same vertical grids. A ballpark choice still lists every accurate candidate.
- **Phoenix is on NAD83(2011) / Arizona Central in international feet**
  (EPSG:6405+8228), not the original NAD83, so it needs only GEOID18.
- **`BENTLEY_engineering_frame` and `BENTLEY_alignments` (owner),** vendor
  extensions in `tileset.json`, composed with `ESRI_crs`,
  `EXT_geospatial_crs_source` and `3DTILES_ellipsoid`: the source CRS from
  those when present (they must agree), the body from `3DTILES_ellipsoid`.
  The old name, `EXT_engineering_frame`, is read with a warning.
- **The design globe's story (owner):** a viewer audience first; the rigid
  placement's error is the point; a morph between placements with the other
  ghosted (translucent, once the GPU timer fix showed its true cost); true
  scale by default; two opening measurements; a six-step tour you can leave.
- **The scale ladder (owner):** seven sites from a building to a 30 km pole
  line, each as rigid and reprojected tilesets. Rigid stays as most viewers do
  it, without the scale factor, and each site's error is split into its
  parts, so the small rungs teach grid against ground and the big ones
  curvature.
- **Snapping keeps 1.x's client/server split (owner):** `ClientSnapService`
  (the client, on the CPU over retained geometry until plan 5's GPU pass),
  `SnapService` (the server), and `refiningSnap`, which shows the client's
  answer and updates it with the server's after checking it. `shownPoint`
  draws an exact point that lies inside the mesh on the surface above it.
- **Only verified grids.** An operation may read only plain-named grids that
  `loadGrids` verified against the catalog, whatever chose it: PROJ, a pin or a
  tileset's declaration. Both platforms see exactly the grids loaded.
- **A coarser operation warns, never throws** (`coarser-operation`); 4a's R2
  stands.
- **Jakarta replaced São Paulo** (SRGI2013 with INAGeoid2020 heights, on the
  EGM96 fallback): `proj.db` 9.7.1 has no Brazilian vertical CRS.
- **Tokyo reads JPGEO2024,** PROJ's first choice and GSI's official geoid;
  GSIGEO2011 is a test case.
- **Tidal datums:** Denmark's DKLAT(2023) is the tested LAT; `proj.db`
  relates the Dutch LAT depth only by a ballpark.
- **EGM2008 is opt-in** (80.6 MB, `--grids egm2008`), loaded whole.
- **Strict WKT2 everywhere** for declared and app-supplied CRSs; the
  explorer's "Try your own" still takes WKT1, labelled, under the grid rule.
- **`/frames-data/proj/` still serves the pinned GEOID18 grid** that setup
  verified; every other grid comes through `/proj-grids/`.

Held for the owner, still open:

- The owner's real long models for the design globe's ion slots (built empty),
  with their CRS, units, site transform and placement mode.
- Hosting NOAA's VDatum surfaces (MLLW, MHW and others).
- Taking the upstream proposals (the placement mode, alignments, a declared
  operation, the site transform) to the right people.
- A hosted grid service, with CORS and possibly cropped tiles.
- Plan 5's spec (`docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`)
  and its four questions.
- Whether a frame with `geoidFallback` and `allowBallpark` should take the
  ballpark, as it does today.

_Carried forward from frames plan 4b._ These are deferred items that are real
work. The wording and test-strength nits the reviews raised are left out.

- **Grids: cropped regional tiles** for large grids such as EGM2008 (setup
  could make them).
- **Grids: deformation models.** `load` skips a candidate that needs a
  deformation model's `.json`, because PROJ names its component grids only
  inside it. Read them from the model and load them.
- **Grids: stale files in the store.** A crashed run leaves a uniquely named
  `.partial` (sweep them in `ensureGrids`), and grids dropped from the sets
  (NADCON5, GEOID99 and GEOID03 tiles, Arizona's HPGN, the Dutch LAT) stay in
  `grids/`.
- **Engineering: Mercator (Spherical) on an ellipsoid** (EPSG 1026): support
  PROJ's conformal sphere R_C(φ0) in `gridFactors`, with tests.
- **Engineering: the vertical-grid diagnosis compares datums by name,** and
  a named best operation may itself need an absent grid. Compare by code where
  PROJ gives one.
- **Engineering: an ESRI_crs-only tileset isn't placed** (it has no placement
  mode), a `wkid` of 32767 or less is read as EPSG, and the area of interest
  derived from a bounding volume is untested on the Moon.
- **Engineering: EGM96 against its publisher.** Add a case if NGA's grid-node
  or bilinear values become reachable.
- **Streaming: the content worker grows 7.9 kB** because Vite inlines the
  declaration parser's dynamic import in workers, and `modelMatrix`'s setter
  compares exactly.
- **Snapping: occlusion is tested only against the hit draw,** and not at all
  when it kept no geometry; the scratch buffers stay at about 11 MB after a
  200,000-vertex snap. Plan 5's GPU snap pass handles both by construction.
- **Plan 5 API review:** `@internal` test options (`pins`, `importGlue`,
  `catalogPins`) no longer ship in the public `.d.ts` (`stripInternal`, the
  file split's second pass); check nothing outside needed them.
  `projTokenProblem` and `Alignment.horizontalElements` are newly exported.
- **Renderer / engine: translucency passes** could clip to the blended draws'
  screen rectangle, the exact-mode sort could skip empty pixels
  (`composite.slang`), and `translucentRange` ignores the frustum.
- **Renderer / engine: the sleeping frame loop.** Wake on the inputs it still
  can't see (`View.readHdr`, `PointCuller`'s pipelines, Safari's pixel-ratio
  changes), let per-frame sync loops (the translucency example) sleep, and
  document the accessors' behaviour change (`Camera.version` and the View
  fields lose their own keys). The Viewer's clock listener isn't removed on
  destroy (older), and MOON_ME's label jumps 10 px for one frame while
  playing (untraced).
- **Example (design globe):** external camera changes don't wake its driver;
  the accuracy's ±2.0 m per end is GEOID18's height figure and should say so
  or split horizontal from vertical; a snap that falls back to the surface
  should say so in the status line; the legend lists the ghost and ribbon
  while the ruler view sets them aside.
- **Example (frames explorer):** its legend and tree read `operation.accuracy`
  for a fallback frame, and the accuracy bar's shares ignore unknown terms;
  an EGM2008 opted in stays loaded for the page's later runs; the split
  between a failed and a missing grid is untested.
- **Dyno (security): `bench/suite`'s Snyk findings,** all from before plan 4b:
  a High DOM XSS in `suite.html`'s `document.write` of the 1.x build URL, two
  Medium DOM XSS from stored chart HTML (Compare, Trends), one from an error
  into a script `src` (Explorer), a CWE-770 in `frozen.mjs`'s static server, an
  open redirect in `limitsTier.ts`, and a false positive on `ionToken.ts`'s
  storage key.
- **Repo: prettier in `packages/next`.** Run there, `prettier --check .` flags
  37 files from before plan 4b (generated shader JSON, bench results,
  `tsconfig.lib.json`, three scripts), because the root `.prettierignore`,
  which leaves JSON out, applies only from the root.
- **CI: run `packages/next`'s vitest on Node 24.** CI runs only the root's
  Karma tests, and the package now declares Node 24 in `engines`.

_Engine fixes made alongside plan 4b (2026-11-07)._

- **On-demand rendering stays idle again** (`2bfc87e395`, `4df1579ad4`): a
  settled exposure ignores the meter's own half-float rounding, which had kept
  OSM Buildings rendering every frame; the test runs on Node 22 and pins the
  band's edges.
- **Translucency and the GPU timer** (`62a56785d4`, `8c8e87361a`):
  translucency passes run only for translucent draws a view shows, and the
  GPU timer counts overlapping passes once (Apple GPUs had counted a small
  translucent quad as about 46 ms, not about 1 ms). Benchmark results carry
  the timer's version, and older GPU medians are kept apart as
  `gpuSummedP50`.
- **The frame loop sleeps when settled** (`075cd8b27e`, `2f2940e6bb`): no
  requestAnimationFrame while nothing changes, woken by every fingerprinted
  change, with the order tick, render, then after-tick work.
- **No native PROJ call on an object PROJ couldn't create** (`4cc6030f87`),
  which had segfaulted Node.
- **Node 24 in `packages/next`'s `engines`** (`ce15acf113`), as the gallery's
  `DisposableStack` and the tests need.
- **Dyno shows Scenes without runs** (`95371f3fff`).
- **Dyno has one ion token setting** for every view (`d2cca2f34a`), and builds
  never embed `.env.local`'s token.

**Frames 5a results (2026-11-09).** Plan 5a
(docs/superpowers/plans/2026-11-07-frames-5a-core-and-camera-chain.md) built
the core and the camera chain: the entry points and their dependency rule,
render space with anchors and an eye per anchor, rigs, the camera layer and
the reference frame resolver, the catalog, `attachSky`, picks and the pick
interpreter, the coordinate service and `hosted`, per-vertex placements, the
query interface, the seams with their bypass tests, and the surface map.
Scene items (§13.25) replaced the design globe's pairing of two tilesets.
Closed by Task 22.

- **Parity.** On Metal, the parity suites the tasks ran (image, models,
  tracks, heights, tileset) matched the base commit except the tileset
  suite's row 16, `InstancedRTC` unlit. Its FLIP moved
  from 0.015939687808453853 to 0.015947530756269895, with the other two
  values at 0.015694062963991402 and 0.14132077991962433. The GPU's inputs
  are bit-identical. Metal reorders a float sum when a kernel's code changes:
  once `relativeMatrix` multiplies by the anchor's axes, even the identity,
  even behind a branch that never runs, the compiler sums the instance's
  translation in the order the code is written, and 14 of 75 components move
  by one float32 ulp (3.6 to 22 micrometres at 40 to 380 m). That is not a
  precision loss: against the exact sum the old order was closer, but
  neither order is promised. One 4× sample at pixel (113, 152) flips. Plan call 18
  promises the inputs, not the pixels, and no engine change was made. Whoever
  re-baselines the gate takes these three values. Any later kernel edit can
  move a row the same way, so explain a one-ulp difference before accepting
  it.
- **Draw records grew by 16 bytes** each, for the placement (about 4 MB at
  the most draws).
- **`castRays` and the terrain line of sight test unplaced triangles.** A
  ray ignores a per-vertex placement. This is documented, and left for 5b or
  the tessellation engine.
- **Loops.** The Slang loops that ran to a count read from a buffer or a
  local are now bounded by constants with an early `break`, and their buffer
  indices clamped: the image-based lighting prefilter and irradiance
  kernels, the light table's assignment and the surface's per-pixel light
  list and sample loop. Tint still guards every loop it can't prove finite in
  the Metal it makes, so the gain is the rule, not a faster kernel.

_Carried forward from frames plan 5a._ These are deferred items that are
real work. The wording and test-strength nits the reviews raised are left out.

- **Tile selection and casters: measured costs, accepted for now.**
  Selection takes 2.75 ms on Google's tileset at 150 m. The shadow casters'
  bytes are 2.09 and 2.45 times the view's on one photogrammetry tileset. A
  return after 60 s with a full cache can cost reloads, since cold tiles
  are dropped only on evidence they are not coming back. The shadow pass's
  own GPU time is unmeasured.
- **Queries (5b).** Standing queries don't reach `measure` yet, and the
  explorer's re-trace should subscribe to standing answers. Tile spheres are
  wider than their tiles (use `Tile.volume` boxes), and a per-world revision
  over-triggers standing queries.
- **Sky (5e).** `attachSky` falls back for the whole sky at once, where the
  resolver falls back per edge of a route. Settle which is right when the
  physical sky goes per body, together with the exposure tuning (the 0.18
  target and the highlight guard need more testing).
- **Emission in nits (owner, 2026-11-08; build after the file split, before
  5e).** glTF 2.0 defines an emissive value of 1 as 1 cd/m2, and says adding it
  directly to display pixels is incorrect. `KHR_materials_emissive_strength` is
  a unitless multiplier that keeps those units. So a material with the
  extension emits factor x strength nits, multiplied by exposure and metered,
  with no scale of our own. A material without the extension stays
  display-relative, which departs from the core spec on purpose: most models
  treat 1 as "fully lit", and read literally they'd go black outside the night.
  An override per item or material (`emission: "physical"` or `"display"`)
  handles the jump this leaves between no extension and a strength just past 1;
  display-relative stays out of the meter. A custom shader has one field,
  `material.emissive`, in nits: a draw with a custom shader is physical unless
  its item or material says `emission: "display"`, which a stylistic glow can
  use. Seven of the Slang playground's presets write it, and the handbook's reel
  uses four of those shaders, so they need `emission: "display"` or new values.
  Emitters only show to the camera, and don't light their surroundings. Try it on real models, since the default may change. Today
  `gltfParse.ts` ignores the extension and `surface.slang` treats all emission
  as display-relative.
- **Exact lists and the meter.** A layer with emission writes a second list
  node for the meter, so the 32-node cap holds 16 such layers, and at the cut a
  layer's emission can stay without its body. The moments branch of `layersAt`
  has no Node port or pin.
- **Plan 5i's list (the API review):**
  - "placement" means five things: `SceneItemOptions.placement` (a number from
    0 to 1), the `Placement` union, `Tileset3D.placement`, `ModelPlacement`,
    and `/proj`'s `TilesetPlacement`, `PlacementMode` and `placeRigid`. An
    item's number can't grow into a fitted operation, so rename it to a
    position blend before anyone relies on it;
  - `/proj` holds what a host needs (`placeHosted`, `pickDesign`, `Alignment`,
    `SnapService`, `ClientSnapService`, `EngineeringFrame`), beside the `Pj*`
    types. Split an engineering entry from `/proj` before 5f adds to it;
  - "opacity" has two meanings: a region at 0.5 stops picks and can stay
    ground, an item at 0.5 lets picks through, casts nothing, and is ground
    only if nothing opaque draws;
  - two ways in: `Engine.addTileset` against `loadTileset` plus `world.add`;
    `TilesetOptions.customShader` and `style` against
    `SceneItemOptions.shader`; `show` on both; `anchor` and `modelMatrix` on
    the tileset though an item attaches to a reference frame;
  - `SceneItem.surfaceRank` holds a rule from one example (a translucent item
    counts as ground only where no opaque item draws), under a header saying
    the engine gives items no meaning. A host may want otherwise;
  - core names in the public surface: `castTerrainRay`, `TerrainRay*`,
    `SlicePool`, `SliceUser`, `STAGES`, `MaterialFlags`, `BASE_*_LIMITS`,
    `PLACEMENT_MONOMIALS`, `collectFullDetailContents`, `summarizeContent`,
    `tileHeaderKey`. Ion's names belong behind the content source of §13.21;
  - smaller: `FrameStats` beside `FrameResolver` and `FrameMotion`;
    `PickCamera` in both core and `/proj`; a `Globe` takes degrees in
    `terrainClipped`, radians in `sampleHeight`; `/frames` publishes
    `toParentMatrix`, `rotationPart` and `frameBias`; `/proj` lists
    `projTokenProblem` and `strictWkt2`; `/measure` re-exports `C` and `GM_*`;
  - a view bit freed by removing a view can be reused, so an item masked to the
    old view appears in the new one;
  - `eastNorthUpToFixedFrame`'s engine callers keep the normal at the point,
    for parity with the Earth, so two east-north-up conventions differ by
    about 0.13 microradians at 250 m;
  - `sampleHeight`, `exactHeight` and `surfaceHeight` work in
    radians;
  - what the geometry-submission check can't see: storage-bound vertex data,
    a plain `pass.draw`, calls through a variable, and a second Slang
    arguments buffer under another name;
  - a hosted tileset gets design coordinates only through the pick
    interpreter, not through `pickDesign` or snapping;
  - `Sky.starsOn` is private, and the re-rooting page reads it;
  - examples that import `src/` internals, for the review to list.
- **Upsampling follow-ups.** No local imagery stop (an `upsampledFromParent`
  rule); a refetch per child after eviction, which bypasses the terrain
  request window; imagery slices sit outside the byte budget; the worker path
  of upsampling has not been run.
- **Smaller engine items.** `Ellipsoid.cartesianToCartographic` loses about
  0.3 micrometres of height near the equator. Tile load, unload and slot reuse
  have no clip tests. A thrown server error does not reset the snap run. The
  design globe shows a thin line where its item switches to opaque, and its
  rigid normals stay as they are until the §13.26 review.
- **Content the engine doesn't load yet.** Implicit tiling, all of a tile's
  multiple contents, S2 volumes, metadata and glTF 1.0 content; point clouds
  and vector tiles (`pnts`, `vctr`, `geom`) wait for the vector renderer.

Owner-requested later work, written up as notes and designs, is §13.17 to
§13.26: layers, scene items (§13.25), reference data (§13.24), the indirect
draw risk on Intel integrated GPUs (§13.23) and the review of geometry
through placement (§13.26).

**Frames 5b results (2026-11-09).** Plan 5b
(docs/superpowers/plans/2026-11-07-frames-5b-frames-library.md) built the
frames library: two-vector reference frames with freezing and angular
velocity, rig presets with `held(view)`, piecewise reference frames, accuracy
composed beyond first order, rays through the reference frames (body,
impostor and tileset targets, light time, terrain bands), bulk work in slices,
`measureSpan` as bulk work with factors once, PROJ batches, and a time
formatter the time controls now use.

- **What was measured against SPICE** (twoVector fixture, 12 instants across
  the Artemis II span). Axes: worst 7.6 × 10⁻⁹ rad (orbital, inertial and
  level presets: 2.5 × 10⁻⁹, 2.4 × 10⁻¹¹ and 3 × 10⁻¹⁶ rad), inside call 6's
  1 × 10⁻⁸. Angular velocity by ±0.5 s central differences misses call 6's
  tolerance for ORION_LVLH (3.9 × 10⁻⁷ rad/s worst, against 1.6 × 10⁻³ rad/s)
  and EARTH_MOON_ROT (2.5 × 10⁻⁸ against 2.4 × 10⁻⁶). A wider step cuts the
  Earth-Moon error from 5 × 10⁻⁹ (0.5 s) to 2 × 10⁻¹¹ rad/s (60 s): the axes
  carry about 10⁻⁹ rad of jitter, taken over one second. That is precision,
  not an accuracy figure, and SPICE's own rate for a dynamic reference frame
  is numerical too. The two cases stay as known misses in the data test, not
  loosened. The plan's "0.001 rad/s within 1 × 10⁻¹²" cannot hold: the
  difference's truncation is (rate × 0.5 s)² / 6 of the rate, 4 × 10⁻¹¹ rad/s.
  The near-point frame (ORION_NADIR) needs NAIF's Earth PCK and the Moon frame
  kernel, which are not on the machine that built this: its geometry is tested
  analytically only.
- **Accuracy moves.** None. The 384-row baseline (every scenario's composed
  views and six `measure` cases) is unchanged, so `accuracyMoves.json` was not
  needed. The edges' new statements are additive: the library's MOON_ME now
  states the explorer's 3 × 10⁻⁷ rad (estimated); ITRF's two figures give the
  tree the same root-sum-square in radians.
- **Rulings.** The resolver's `motion` is left as it was (it already differenced
  over the catalog). `BulkOptions.signal` collides with `MeasureOptions.signal`,
  so `measureSpan` takes bulk options under `options.bulk`. Non-cockpit presets
  keep `forward` and `up` for the preset's own axes (+X, +Z); `level`'s
  `forward` picks the body axis. The tileset target reads a tile and a tileset
  through two small structural interfaces, so it is tested without a GPU.
  The widgets import the Intl helpers from `@cesium/next/time`, so the time
  entry exports `ianaOffsetMinutes` and `ianaAbbreviation`.
- **Not done: `accuracyOf` and the explorer's walk on `separationAccuracy`
  (Task 5, second half).** Building them on the composer would make every
  east-north-up reference frame without an accuracy unbounded in `accuracyOf`
  (the DSN-station rows, many `measure` and design tests), and would drop the
  Earth-orientation term for two Earth sites, because the route never crosses
  ITRF. That is a wide behaviour change across `measure`, the design tests and
  the explorer, so it needs a pass of its own, with its moves listed. One rule
  to settle in it: the ephemeris edges share a "difference" source, but a
  route from an Earth site to Orion crosses GCRF and EARTH_ICRF, both the
  Earth's position, which cancels rather than counts once.
- **Browser checks.** `parity` and `alloc` ran at the end on port 5193: the
  parity numbers are identical to the three runs before this branch (Apple M2,
  Metal), and the allocation gate shows 16,878 bytes a tick against 16,702 and
  16,787 on the base, with no new site (an idle `Engine.bulk` registers no
  tick listener). Not run: the time controls and the design globe on their
  pages (Task 12), and the bulk task's own browser page (Task 9).

_Carried forward from frames plan 5b._ Real deferred work only.

- **`accuracyOf` and the explorer's walk on the composer,** with the moves
  listed (above).
- **Angular velocity at a precision the fixtures can hold:** a wider or adaptive
  difference step for two-vector reference frames, or SPICE's own derivative
  written out, so ORION_LVLH and EARTH_MOON_ROT meet call 6.
- **The near-point fixture:** run `frameFixtures.py twoVector` with the frame
  kernel and the Earth PCK to add ORION_NADIR.
- **Rays:** the tileset target culls by `Tile.volume` boxes and treats a
  sphere volume as covering the whole segment; a standing query with a frame
  takes its revision from the world's content revision alone, not from the
  frame resolver's routes.
- **Terrain bands** are offset ellipsoids; the Earth's geodetic offsets differ
  from them by metres near the poles.

_Carried forward from the sky and observer plan._ These are deferred items that are real work. The nits are left out.

- **The veil's asymmetric form.** The veil is symmetric about a source. The paper's glare filter is perception-based and its body wasn't read here (only its abstract), so what it makes of asymmetry isn't known.
- **A truss across spikes.** A sprite takes one visibility value, so a beam across a bright star's spikes can't cut them. The veil is cut per pixel and is right.
- **The Moon and planets in the light list.** `lightListFor` and glare's records hold the sun and stars. Adding them also ends the Moon's undercount where it clips at a low EV100.
- **The eye's color for bright stars.** Under dark adaptation bright stars read gray-blue (`eyeSees`), where the eye sees their color. A decision for the owner, by looking.
- **Ambient occlusion's slot.** It feeds shading before the opaque pass, so no post stage can hold it. It needs a slot there.
- **Graph-level slicing (§13.32).** A long chain of stages on a slow GPU has no way to spread over ticks.
- **A `Renderer` interface**, when a second renderer is chosen (§13.32). Not before.
- **A hidden sun's veil pops at the screen's edge.** While any disc tap is on screen the veil takes its visibility from those; a sun leaving the screen jumps to the body-only answer in about one tick of a pan.
- **Recovery after device loss.** A loss turns the stages that were on off for good and says so; nothing listens to `restored`.
- **The eye's limit costs 3.9 ms at 2560×1440 on an M2** (the cost page), the biggest single post stage. A half-size ring would cut it.
- **The terms of the default sky pack's sources, still unsettled.** The pack stays marked not cleared and local. This plan concludes nothing about licences.

### 13.15 GPU resource limits and capacities (r50, design)

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

**Arena slabs** (replacing §13.9's "arena pages"). Bevy's mesh allocator
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
  scheme) instead of first-fit, which §13.6 asked for if streaming
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
texture and sampler "lets" (desktop 146) are a step toward it (§7.1).
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
   (a stopgap: the vector pipeline is to be generalized, §13.9).
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
  size classes wait for a measurement of streaming churn (§13.6).
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
  `World.textureRefs`, the one shader accessor and its guard test (§7.1).
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
  migration (§3.4, "Slang-first, for real").
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

### 13.16 Ray queries: where they run, and when acceleration structures are built (design, owner 2026-11-06)

The owner: "we're going to have to think carefully about ray queries, where
they're performed, when we build acceleration structures, etc." §13.10
sketches the techniques: CPU lookups on terrain, GPU raster probes and
compute ray tracing. This section is the architecture they have to fit into.
It is open, for a brainstorm before any plan.

**The first implementation.** The frames example's Task 5b adds
`castTerrainRay` and a read-only `TerrainRayTarget`: an exact float64 ray
against the drawn terrain triangles, traversing a grid per tile. It raised
the questions below:

- the first query after tiles load spends about 36 ms building each crossed
  tile's grid on the main thread;
- spans off screen count as "unknown";
- tiles still waiting on availability are treated as final.

**Use cases** (the requirements come from these):

- line of sight (a dish, a mast, a drone camera, a robot tool, two objects
  anywhere in the frame tree);
- picking and frame-tagged picking (plan 3 R8);
- clamping and `sampleHeight`;
- viewsheds and footprints (many rays);
- measurement (distance to the surface, clearance);
- collision and reach checks (a robot arm, a camera's minimum range);
- path tracing (§13.10).

**Questions to settle:**

1. **Where a query runs.** The options are synchronous on the main thread, a
   worker, GPU compute, or GPU raster probes. They differ in latency (same
   frame, or frames later), in what geometry they can see (the CPU has
   terrain triangles but no 3D Tiles), and in cost. One API should route by
   target and batch size: a single pick ray or a single line of sight wants
   sync; a viewshed of 10⁵ rays wants GPU.
2. **When acceleration structures are built:**
   - at decode, in the worker, with the mesh (a BLAS or a terrain grid,
     shipped with the tile);
   - lazily on first query (today, which is the 36 ms cost);
   - per frame for the top level (a TLAS over transforms and instances, which
     is cheap).
     This is memory against latency. The structures count against the tile
     memory budget (§13.6) and are evicted with their tile.
3. **Which geometry a ray sees:**
   - the drawn LOD for the current view (what the user sees, view-dependent,
     and coarse far away);
   - the finest loaded LOD;
   - a view-independent "best available" that can request refinement along
     the ray and answer later.
     Line of sight and picking may want different answers. Unknown must always
     stay unknown.
4. **Which spans are unknown.** Above a body's highest possible surface (its
   terrain height band), terrain can't block. Rays must clip to that band
   before counting off-screen or unloaded spans as unknown, or every
   ground-to-space query is "unknown". The same applies to other bodies (the
   Moon in MOON_ME).
5. **Many views and stereo.** Each view has its own drawn LOD (§13.4).
   Queries name the view they are consistent with, or none.
6. **The frame tree:** see plan 5's "Ray queries through the frame tree"
   (§13.14). Rays and targets live in frames, at an instant, with composed
   accuracy.
7. **The API shape.**
   - Batched rays in and hits out: distance, point, normal, target, feature,
     and the frame each is reported in.
   - Every result carries accuracy and unknown spans.
   - Sync and async variants, with `AbortSignal` and progress for large
     batches.
   - It shares the per-frame budget with streaming (plan 5's "async only for
     bulk work").
8. **Precision.** CPU queries are float64. GPU queries use hi/lo,
   camera-relative origins. Hits are refined on the CPU when an exact answer
   matters, the way 1.x refines picks.
9. **Validation data.** Published horizon masks, such as the DSN's for DSS-14, DSS-43 and DSS-63 (810-005, as used by the frames example's dish scenario), are measured horizons. Comparing ray-query terrain horizons against them, across terrain sources and levels of detail, is a standing validation test for this work (owner, 2026-11-06).

### 13.17 Layers: engine, renderer and GPU backend (notes for later, 2026-11-08)

The owner's question: Cesium is a rendering engine that contains a renderer, so is "core" descriptive enough, and how would a WebGL 2 backend go in? These are notes, not a design. The rule from §13.14 still holds: no compromises in the WebGPU approach while the prototype is built.

**The usual terms.** These names are from general knowledge of those engines, so check them before quoting them to outside readers.

- **Engine:** the whole runtime: the loop, the scene, streaming, content, queries.
- **Renderer:** turns a description of what is in view into GPU work: passes, pipelines, culling, shadows. Filament separates its engine, renderer and backend this way. Bevy copies the scene into a "render world" in an extract step, and Unreal keeps render-side proxies of its scene objects.
- **GPU backend** (Unreal's RHI, wgpu-hal): a thin layer over a graphics API.

"Core" names none of these. Today it means everything in the main entry point (`.`), from `GpuDevice` to `Tileset3D`, while the `src/core` folder is 62 lines holding an emitter and a clock.

**Where the code stands (grep counts on 2026-11-08, after the file split; rough, and they count matching lines).**

| Measure                                                                                                       | Today                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lines with raw WebGPU calls (pipelines, passes, buffers, textures, dispatches, indirect draws, buffer copies) | `src/render/view` 74, `src/render/world` 12, `src/scene/world` 11, `World.ts` 7, `Engine.ts` 6, `GlobeImagery.ts` 6, `src/scene/renderTarget.ts` 2, `src/scene/heightCaptures.ts` 2. Before the file split, by the same grep: `Engine.ts` 82, `World.ts` 27, `View.ts` 2 |
| `src/streaming`                                                                                               | No files use the GPU API directly, but it imports from `scene` (21 imports, 13 before the split: the types and helpers now come from more files) and `render` (2), and `src/globe` imports from `scene` (7) and `render` (4)                                             |
| `scene` files mentioning WGSL                                                                                 | 17, including the style compiler, which emits WGSL text                                                                                                                                                                                                                  |
| Compute entry points in Slang                                                                                 | 43                                                                                                                                                                                                                                                                       |
| `src/shaders` modules using storage buffers                                                                   | 16 of 25                                                                                                                                                                                                                                                                 |
| GPU types in the public entry point                                                                           | `GpuDevice`, `Capabilities` and limits are exported; `CustomShader` takes `wgsl`                                                                                                                                                                                         |

So streaming's logic is already free of the GPU API. `Engine.ts` and `World.ts` no longer hold the passes: the loop and the scene's bookkeeping stay in them and in `src/scene/world`, and the passes and other GPU work are in `src/render/view` and `src/render/world`. The second pass split the dependencies too (below): those functions take narrow contexts. The seams (`DrawConstants`, `DrawArguments`, geometry submission, bindless resources, ray queries) already narrow how draws are written, but they are inside the renderer. They aren't a boundary between the renderer and the scene.

**A thin backend can't carry WebGL 2.** Today's renderer is GPU-driven: compute culls records, indirect draws consume the result, and vertex shaders pull from storage buffers. WebGL 2 has no compute, no storage buffers and no indirect draws. A wrapper at the API level would have to emulate all three. So there are two different seams, and they do different jobs:

| Seam               | What it enables                                        | Fits                                                                                                                                                               |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GPU backend        | Another API with the same abilities                    | A native WebGPU implementation needs nothing, since it's the same API. Not useful for WebGL 2                                                                      |
| Renderer interface | A second renderer over one scene and one content layer | WebGL 2: CPU culling, attributes and uniform buffers or data textures, one draw call per record or batch, fewer features, declared through capability tiers (§3.1) |

**The options for reaching browsers without WebGPU, cheapest first.** Choose from the browser compatibility data when the time comes.

1. **Nothing new:** an application that needs those browsers uses 1.x there. This costs only documentation.
2. **WebGPU compatibility mode:** closer to today's renderer. Its known problem is storage buffers in the vertex stage (§3.1, §13.9), so it probably needs a second vertex path rather than a second renderer. Not examined further.
3. **A WebGL 2 renderer:** a second renderer, loaded as its own chunk so WebGPU users don't pay for it. It's real work to build and to keep at parity.

**What a second renderer would need besides drawing.** Shaders are the hard part:

- Slang can target GLSL, but whether its output fits GLSL ES 3.00 needs a spike. Nothing has been tested.
- 43 compute kernels need CPU equivalents or a design without them. Some, such as culling, have obvious ones. Others, such as atmosphere tables or FLIP, may need fragment passes or to be dropped.
- The style compiler (`styleExpression.ts`) needs a GLSL emitter or an intermediate form.
- User shaders written in WGSL wouldn't port. Slang ones might, which would be a reason to steer portable shaders to Slang.
- Picks and depth readback need another path, and queries need their CPU backend.

**The proposed layers.** This is a sketch, and folder names follow later:

| Layer      | Holds                                                                                     | Must not depend on  |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------- |
| Foundation | Math, events, errors, byte readers                                                        | Everything below    |
| Content    | Tile trees, selection, requests, cache, parsers, terrain and imagery logic                | Renderer, GPU types |
| Scene      | The loop, views, cameras, lights, clocks, what exists and where, queries                  | Renderer internals  |
| Renderer   | Passes, pipelines, draw records, culling, shadows, atmosphere, shaders, the shader linker | Content's internals |
| GPU        | Device, limits, errors, timers                                                            | Renderer            |

**What to do when.**

- **At the big file split (before 5b), at no cost to WebGPU (done 2026-11-08):** split `Engine.ts` and `World.ts` along these lines instead of by size alone, so the loop and scene bookkeeping separate from the passes. These are pure moves, as already planned.
- **After that split, when it's cheap:** give `src/streaming` and `src/globe` a narrow interface for adding, updating and removing draws, in place of importing `World` and `render/layout`. Add the layers to `test/importBoundary.test.ts`, so content can't import GPU types. That test already assigns layers by file rather than by folder.
- **Done 2026-11-09, the second pass (`docs/superpowers/plans/2026-11-09-split-second-pass.md`):** published types no longer carry `@internal` members. A class's shared state lives in objects made once in its constructor: `WorldRaster` and `WorldScene`, `EngineRaster` and `EngineScene`, `TilesetState`, `ViewerState`, `ViewAnchorState`. Moved functions take narrow contexts over them, whose `raster` and `scene` keys say the side. `src/streaming` and `src/globe` use `DrawSink` and `TilesetHost`, and the import test enforces content, scene, renderer and GPU tiers. What's left, named in that test: `Tileset3D` and `Globe` still import `World` and `Engine` for public signatures (for 5i); `GlobeImagery` and `SlicePool` composite on the GPU from content; `Environment` in `src/gpu` loads a kernel; the renderer imports `Globe` for picks and `cityLight` for its data. `draws.ts`, `meshes.ts` and `materials.ts` cross the sides, and their contexts show how much: they're the next to separate when a second renderer is chosen.
- **For the post-processing design (§13.22), from what the pass left visible.** Passes aren't declared units yet: `buildViewFrame` registers them in order, and each body closes over a `ViewFrame`. A stage's inputs and outputs are not declared anywhere. What a stage API will need: its resources named per view, since targets live in `ViewFrame` and `OutputPassEngine` reaches for shared scratch (`presentData`, `adaptData`, `fxaaData`) on `EngineRaster`; readback queues a stage owns, since `meters`, `depthRanges` and `hdrReads` are engine-wide and drained in `render`; and a place for per-view state, as `View.autoExposure` and `View.pendingHdrReads` remain `@internal` on the view for the observer to take.
- **Not yet:** an abstract `Renderer` or backend interface. With one implementation it would be a guess, and it would pull WebGPU's design toward the lowest common case. Write it when a second renderer is actually chosen, using the spike to shape it.
- **Open for the API review (5i):** what to call the main entry point and "core" in the docs, and whether `GpuDevice` and `World` belong in the public surface. A host application that shares a device may need `GpuDevice`, so don't remove it without checking.

**Widgets: a subpath now, a package at release (2026-11-08).** `Viewer`, the inspector, the credits and the time controls are the `@cesium/next/widgets` entry point (`widgets/index.ts`). They import the other entries only by the package's name (`@cesium/next`, `/time`, `/frames`), so `test/importBoundary.test.ts` fails on any import from `widgets/` into `src/`, and splitting them out is a move of the folder and its `package.json` and `vite.lib.config.ts` entries, not an edit of their imports. `Emitter` became public for it (`Viewer.events` is one). The 1.x package `@cesium/widgets` already holds that name, so the separate package is called `@cesium/widgets` only when 2.0's packages get their final names. Two things keep the library lean. The package's `sideEffects` list is what lets an application build tree-shake the frames entry, so a module that must run on import has to be added to it. And the library build's frames entry is `scripts/libEntries/frames.ts`, not `src/frames/index.ts`: with the index itself as an entry, the widgets entry reached everything it re-exports, and a page that only created a Viewer loaded the IAU series and the DAF reader (`test/libraryWidgets.test.ts` pins that). The library build also writes `dist-lib/package.json` naming the folder `@cesium/next`, so the bare names in the widgets' declarations resolve for a consumer.

**Measure before choosing.** Share of target browsers without core WebGPU, from the handbook's compatibility tab; whether compatibility mode covers most of that share; and the Slang to GLSL ES spike on two kernels and one material.

**What the file split had to watch (from plan 5a's whole-branch review, 2026-11-08). The split is done; the first two points still apply to anyone changing these files, and the last is still to do.**

- Pass order is registration order. `FrameGraph` has no sort, and the 20 `addPass` calls are all in `buildViewFrame` (`src/render/view/viewFrame.ts`). Keep the registration sequence in one function; the bodies are in `scenePasses.ts`, `translucentPasses.ts` and `outputPasses.ts`.
- 98 test files use `as unknown as`, many to reach privates (`recordsU32`, `drawBatches`, `viewFrames`, `cascades`, `ready`, `loading`). A moved field fails at run time, or reads `undefined` in a comparison and turns an assertion vacuous. Change the tests in the same commit.
- `Engine.ts` had 20 module-level scratch values, and `selectionViews` and `selectionCasters` shared one array, safe only because of the order they ran in. Each moved function now has its own.
- `Globe extends Tileset3D`, with 23 `this.source` branches in the base. The base's constructor builds `itemHost` and a `SceneItem` for a globe. Keep that order.
- `Tileset3D.update` depends on order: casters follow view selection, and `receivers` reads other tilesets' `lastSelected`.
- A helper importing back from `World` or `Tileset3D` could leave `class Globe extends Tileset3D` evaluated too early. `test/importCycles.test.ts` now checks that.
- Names that pin files or methods: the seams allowlist (`bindSlab` in `src/render/world/tables.ts`, `drawOverlays` in `src/render/view/outputPasses.ts`), source pins in `test/shadowCasters.test.ts` and `test/terrainTranslucency.test.ts`, `handbook/src/pipeline.ts`, and the counts in this section. A seam detector that matches `records` names stops seeing a helper that renames them.
- `sideEffects` lists no `src/` module, so a split-out module that must run on import gets tree-shaken. Run `scripts/checkBundle.mjs` and `test/libraryWidgets.test.ts` after each move.
- Don't fix while moving. `setDrawShader` and `setDrawMaterial` duplicate the batch-move logic; merge them in a separate commit.

### 13.18 Colour in the styling language (owner, 2026-11-08)

**Decided.** CSS notation (`#ff8800`, `rgb()`, `hsl()`, named colours) is sRGB, as CSS defines it, and is converted to linear where it enters the style. Shading stays linear. An opaque, unlit colour therefore looks as written and matches 1.x. Numeric values such as `vec4(...)` stay raw linear.

**For the styling spec work, with the vector language's other changes.** An explicit colour space. CSS Color 4 already has syntax for it (`color(srgb-linear 1 0.5 0)`, `color(display-p3 ...)`), which can pass through the existing `color('...')` string without new grammar, and brings wide-gamut colours with it. Not built.

**Differences from 1.x to document.** Blending happens in linear, so `colorBlendMode: "mix"` and translucent colours differ from 1.x even with matching inputs. This is deliberate (owner, 2026-11-08): 1.x's blending is known to give incorrect results, so 1.x isn't the oracle for blended colours, and parity cases should expect the linear result. `vec4` colours are linear in 2.0, and plain numbers in 1.x.

### 13.19 For a later brainstorm: semantic metadata and picking (owner, 2026-11-08)

Not designed. A question to take up in its own session, then add to this plan: how semantic metadata interacts with the engine as world models mature, and what that means for picking in Gaussian splats and point clouds. Those representations have no surfaces or per-feature triangles, so "what did I pick?" may come from a learned or labelled field, not from a feature id on a mesh. Related: the query interface (§13.16), point clouds and vector tiles with the vector renderer, and 3D Tiles metadata, which isn't planned yet.

### 13.20 For a later brainstorm: editing (owner, 2026-11-08)

Not designed. A question to take up in its own session, then add to this plan: editing use cases, and how the engine can efficiently support things like CAD-style mesh editing or b-rep-based solid modeling. Today's content is streamed, immutable and tiled, so questions include how edited geometry coexists with tiles, how often buffers change, and where a modeling kernel would sit relative to the engine's seams. Related: geometry submission and per-draw constants (the seams), snapping and measurement, the later tessellation engine (§13.14), and design space (plan 5f).

**Vector data and GIS sources (owner, 2026-11-08).** Part of the same brainstorm, for the vector rendering engine. Vector data commonly comes from databases such as PostGIS and similar. How would editing vectors interact with the engine, with ion and with 3D Tiles? The same question applies to MVT servers that stream, to WMS, and to the other common GIS streaming protocols: which of them the engine should read, what happens to an edit when the data is tiled or served by someone else, and how updates reach a view that's already drawing them.

### 13.21 Ion as a swappable module (owner, 2026-11-08)

**Decided to plan.** Ion stays the easiest path and the Viewer's default, but it's one implementation behind an interface, so other tile servers can be swapped in. Not built. Fits the layers in §13.17, and goes in after the big file split or as part of it.

**Today (grep counts on 2026-11-08).** Tile streaming already takes a URL and headers, so a server of plain 3D Tiles works now. Ion appears in `src/io/ion.ts`, `src/globe/ImageryProvider.ts` (`IonTmsImagery`, `BingImagery.fromIon`), `widgets/Viewer.ts` (29 lines, including the `{ ion: id }` source, default terrain and imagery, and credits) and the Moon map loaders. Core imports `resolveUri` from `ion.ts`, which is generic and should move.

**The missing pieces.**

- **A content source interface in core:** an asset reference goes in; where it lives, how to authenticate, what credit it needs and what kind of content it is come out.
- **Credentials that can be renewed:** headers are fixed for a tileset's lifetime, and nothing was found that retries after a 401, so a long session can lose access when a token expires. Worth fixing for ion too.
- **`@cesium/next/ion`:** the ion implementation, plus `IonTmsImagery`, the Bing lookup and Moon loading. `test/importBoundary.test.ts` stops core importing it.
- **The Viewer:** `new Viewer()` still gets terrain and imagery from ion with no setup, loaded on demand, and an application can pass its own source.
- **`src/io/itwin.ts`:** a second implementation, to test that the interface isn't shaped around ion.

**A default evaluation token (owner, 2026-11-08).** `@cesium/next/ion` ships a default access token, as 1.x's `Ion.js` does, so people can evaluate 2.0 without getting a token first. It's only for evaluation. Rules:

- Show 1.x's on-screen notice (`Ion.getDefaultTokenCredit`) whenever the default token is in use, and let an application's own token replace it.
- 1.x's token is per release and is deleted soon after: 1.147's is labelled for deletion on January 1, 2027. So don't paste a copy. Either read it from `packages/engine/Source/Core/Ion.js` at build time, or have a token issued for 2.0 with its own rotation, and make an expired token fail with a clear message.
- This is the only token allowed in source. Update the `AGENTS.md` rule when it goes in: personal and application tokens still never go into code, logs, URLs, test output, screenshots or builds. The build checks that look for secrets (`keepEnvSecretsOut`, the handbook's `findSecrets`) stay on, and the handbook must not include it.

**Two layers, not one (for other sources).** A content source says where content lives and how to authenticate. 1.x's other providers also differ in format and tiling, which needs a second seam: terrain sources (ArcGIS tiled elevation, Google Earth Enterprise, VR-TheWorld, custom heightmaps, terrain as 3D Tiles) must produce the mesh a tile draws, and imagery sources (ArcGIS, WMS, WMTS, TMS, Mapbox and others, see `packages/engine/Source/Scene/*ImageryProvider.js`) implement `ImageryProvider`. Decide which are worth building from demand; most don't belong in the core. Each is its own optional module, so a page pays only for what it uses.

**Later: ion's public REST API.** Wrappers around ion's API calls, separate from what the renderer needs to fetch tiles. 1.147 added the experimental `IonAssetElementService`, wrapping ion's newly public calls for querying, filtering, aggregating and navigating element metadata (BIM and CAD), which 2.0 should cover here. Related to §13.19. Read it in `packages/engine/Source` when this work starts. Name the module for what it does, such as an ion client. The GIS protocols question in §13.20 builds on the same content source interface. Expect ion's REST API to change substantially: keep its wrappers thin and in this module, keep the renderer depending only on the content source interface, and test the asset endpoint's parsing against recorded responses, so a change shows up in one place.

### 13.22 For later: custom post-processing (owner, 2026-11-08)

**First interface built (sky and observer plan, 2026-11-09).** `createPostStage` and `view.observer.stages`: slots `scene`, `exposed` and `display`, a kind (physics, model or look) and a label on each, one fullscreen function or declared passes (fragment or compute) over textures a stage owns, a guard on loops, and per-view values. The first stages on it are the astrophoto curve, the eye's faint-star limit, glare's veil and its spikes. Still open: FXAA on it (Task 18 of that plan was skipped), ambient occlusion (it feeds shading before the opaque pass, so it needs a slot there), instanced draws and storage buffers in a declaration (internal `GraphStage` for now), and depth and id access beyond `postDepthAt` and `postIdAt`. The original note follows. Custom post-processing stages should be exposed through a proper public interface, and FXAA and ambient occlusion should be built on that interface, to flesh it out and prove it. Maybe this needs a graph-based compositing structure, as other engines have. `src/render/FrameGraph.ts` already orders the passes internally, so the question is what to expose and how a stage declares what it reads and writes. It should use the shader linker's named boundaries, and it replaces 1.x's `PostProcessStage`. Also consider where a stage sits relative to exposure and tone mapping (scene-referred or display-referred), and depth and id access.

**Glare in the graph (owner, 2026-11-08; a sketch, to design with this section).** Glare isn't only a sky feature: sun glare on the Earth matters as much as the stars', so it belongs in post-processing, on the same public stage interface. What it has to settle:

- **Order.** Scene and composite in linear HDR, the meter reads, then glare, then tone mapping, then FXAA. Glare doesn't feed the meter. Temporal passes, if clouds bring the first one, and any upscale need a place in this order too.
- **Inputs.** The veil reads the HDR image. Spike sprites read a list of bright sources (stars, planets, the sun, the Moon, maybe glints), each with its own visibility. The sun is a known source with a true luminance, and the image clamps pre-exposed values, so its energy can't come only from pixels. (There are three clamps, not one: the sky march's `SKY_MAX` of 30,000, the table's 60,000 pre-exposed, and `STAR_MAX` of 60,000 cd/m² before exposure; glare adds its own, 10,000 on the image and 200 a sprite.)
- **Sun spikes under occlusion.** A sprite takes one visibility value, and the sun is bright enough for a truss to show across its spikes. A directional blur over bright pixels is one option. To test.
- **Who owns the settings.** The eye's veil and a lens's spikes differ, so the settings belong to the observer (eye or camera) on a view, per view, with a cost tier for each. Multiple views need their own pyramids, or shared ones where sizes match.
- **What a host application can replace.** A stage declares what it reads and writes, as the rest of §13.22 asks.

### 13.23 Risk: indirect draws on Intel integrated GPUs (found 2026-11-08)

Not yet tested. Intel's article 000102979 ("Simple WebGPU application Hangs with Indirect Draw Calls on UHD 700 and Iris Xe iGPUs", last reviewed July 2026) reports a hang with `DXGI_ERROR_DEVICE_REMOVED` on Windows 11, with no fix or workaround, and no driver or draw pattern named. This engine renders with indirect draws by default. All results so far come from two adapters, an NVIDIA RTX 3000 Ada laptop and an Apple M2, with none from Intel or AMD. Do before relying on any reach claim:

- Run the engine on UHD 7xx and Iris Xe under Windows 11, with Chrome and Edge, and record driver versions and any device loss. Find out whether Chrome already works around it.
- Check whether `SubmissionMode = "direct"` avoids the hang and covers every draw path, and what it costs. If so, fall back per adapter.
- Add Intel integrated and AMD machines to the bench's coverage.

**First result (owner, 2026-11-08):** `spikes/gpu-check.html` passed all its steps on an Intel adapter reporting architecture xe-lpg, with no device loss. Driver version and full report still to record. Xe-LPG is a newer architecture than the Xe-LP (UHD 7xx, Iris Xe) that the article names, so that case is still untested.

### 13.24 Reference data shipped with the engine (owner, 2026-11-08)

Not built. Air-gapped and offline use can't download data at runtime, so ephemerides and related reference data should be available bundled, license permitting. Today `scripts/frameData.mjs` and `scripts/setup.mjs` download them into a store outside the repo.

**Shape:** a separate optional data package with its own NOTICE, not the main package, so the Apache 2.0 core takes on no third-party data duties and everyone else doesn't download it. Astropy's `astropy-iers-data` is the precedent.

**What the license text says (read 2026-11-08; have legal confirm before shipping):**

- **JPL and NAIF kernels:** NAIF's rules allow use by anyone, including commercially, and redistribution of unmodified kernels. An excerpted kernel counts as modified, and the attribution must then name whoever last changed it. Logos and any implied endorsement need NASA or JPL approval.
- **Geoids and US grids:** PROJ-data labels EGM96, EGM2008, GEOID18 and NADCON as public domain, but that rests on PROJ-data's labels, not the agencies' own pages. Some national grids are CC-BY-4.0 and need attribution, and UK grids are BSD-2-Clause.
- **EPSG (in `proj.db`):** may be used and distributed, including in a commercial product with added value, but not sold as a dataset, and its terms must pass to recipients. Apache SIS is reported not to ship it for license reasons. Check this one with legal.
- **Earth orientation and leap seconds:** no primary terms found for IERS, USNO or CelesTrak. Open question. These also expire, so a bundle needs a stated date, a refresh path and an honest accuracy statement once it's stale.

**Sizes:** `de440s.bsp` 32.7 MB, Moon orientation 12.9 MB, and the engine's own 2000 to 2050 packs 2.84 MB in all. EGM2008 at 2.5 arcminutes is 80.6 MB, GEOID18 16.7 MB, `proj.db` 9.6 MB. So small packs are cheap, and a full geoid set isn't. Stay on DE440 for now (2026-11-08): DE442's stated purpose is updating the Uranus barycenter, and NAIF lists no matching lunar orientation kernel, while the Moon's orientation here pairs with DE440 (`moon_pa_de440_200625.bpc`). Revisit if a DE442 lunar kernel appears or Uranus's satellites come into scope. Keep the ephemeris version a provider's choice rather than a constant.

### 13.25 Scene items (owner, 2026-11-08)

**Decided, in its small version, in plan 5a Task 20.** The API separates content from being in the scene. `engine.loadTileset(url)` gives the content (tree, selection, cache), and `world.add(tileset, { placement, opacity, tint, viewMask })` gives a `SceneItem`: that content placed in a world, with its own appearance. A tileset can have several items, with one selection and one cache. This replaces the working name "presentation", which reads as the swap chain's present to a graphics programmer.

**Not a scene graph.** Items are a flat list in a world, with no tree walked per tick, since GPU-driven drawing wants flat records. Hierarchy stays with the reference frame tree: an item attaches to a reference frame or anchor.

**For a later brainstorm:** the full version. Models and per-node transforms (5d), `DrawHandle`, `MeshHandle` and `ModelPlacement` as items, the globe as an item, one tileset shared across worlds, groups, editing (§13.20), and how far this should resemble USD's references. Take it up before or with the API review (5i). The owner leans toward following USD's concepts, anticipating a possible convergence of USD with 3D Tiles and glTF: read USD's model of prims, references, payloads and composition, and today's OpenUSD and glTF interoperability work, before settling names and structure. Also read glTF 2.1, in development in the open at Khronos (tracking issue `KhronosGroup/glTF#2585`, read 2026-11-08; explainers, with schema and normative text still to come). A node can reference an external glTF or GLB, loaded once and instantiated many times; bounding volumes on nodes can drive deferred loading; streaming and level of detail aren't defined in its core, and it cites 3D Tiles' extensions for those. So an item's content could be one glTF that refers to others, and 3D Tiles and external assets overlap on loading content on demand. Khronos calls it complementary to OpenUSD.

### 13.26 For later: an architectural review of geometry through placement (owner, 2026-11-08)

Do this before b-rep step 5, the GPU tessellation engine (§13.33), which evaluates placements at points the content never had and takes normals from the placement's Jacobian: a dual position can do neither (moved up by the owner, 2026-11-09). It also has to come before plan 5f's fitted operations are built. Goal: one elegant way of handling reference frames and reprojection through the geometry pipeline, without patched-together machinery. Things it has to settle:

- **Also (§13.34):** the acceptance test that an application can exaggerate everything, the globe and terrain included, through placements alone (exaggeration is the application's, not an engine feature); and clip and section planes in the same coordinates.

- **One model of a placement:** rigid, dual position and fitted operation as cases of a single idea, and what each layer owns: the frame tree (rigid), coordinate operations (non-rigid), content (precomputed results), and the renderer's placement seam (applying the mapping per vertex).
- **Normals and tangents.** Today a dual-position vertex moves but keeps its rigid normal: 0.197 degrees on the 44 km corridor, 0.225 calculated at 50 km. Tried on 2026-11-08: deriving it per fragment from both positions. It fails, because the design position isn't in the fragment stage, a varying would cost every draw, and float32 derivative noise is estimated at about 0.13 degrees up close. Other options: a second normal, 12 bytes a vertex or about 4 octahedrally encoded; a displacement varying on placed draws; or dropping dual positions for a fitted operation with its Jacobian.
- **Everything else carried per vertex or per instance:** instances, skins and morph targets when animation arrives, and what custom shaders see (`positionMC`, `normalMC`, design and placed).
- **Recomputing a placement when the root changes.** The spec (§7.2 step 3, §7.6) has the frames module recomputing per-vertex placements for each root. No such hook exists: `FrameResolver` has no method for it, a placement is a model-space map, and `DrawPlacementInfo.root` names a root nothing is computed for. Harmless for dual positions, and 5f will need it.
- **Bounds, picks and snaps, and shadow casters** through the same model, and the inter-stage varying budget, which is full.
- **2D and Columbus view as design view (owner, 2026-11-08).** Design view (spec §13.2) is 2.0's route to this need: the render root in a projected CRS, tiles fitted flat, and an orthographic camera for the 2D look. As specified, it's regional, drawn within the CRS's area of use. Decide whether a whole-world flat map follows from the same mechanism, with a world-spanning CRS, tiling and wrapping across the antimeridian.
- **What the tile format carries,** and how it relates to glTF 2.1 external assets and 3D Tiles (§13.25).
- **Curves through placement.** Vector geometry as render curves: an exact source (a circle or clothoid in its own CRS), then placement, then quadratic segments with an optional rational weight and a per-segment error bound, refined by view. A conic stays a conic only under projective maps, and a reprojection isn't one, so a circle is exact in design coordinates only, and a measure or snap goes back to the source. Quadratics through a perspective view become rational. Planar faces with curved trims and 3D Tiles 2.0's 3D-native vectors both meet this; curved surfaces meet the tessellation seam, and b-reps (§13.20).

**The review (2026-11-10).** Not yet approved by the owner.

_Today there are three placement ideas, built separately:_

- The frame tree, which is rigid (`FrameResolver`).
- The render placement (`scene/placement.ts`, `shaders/placement.slang`): per draw, in model space, before the custom vertex stage, from a closed set:
  - dual position
  - a cubic fitted over a tile
  - a blend of two fits by a parameter
- `DesignPlacement` (`streaming/designPlacement.ts`): CPU only, with `displayed` and an exact `designOf`. Engineering snaps and picks use it to get back to design coordinates.

They already share most of what's needed: a CPU twin in float64, `maxDisplacement` padding tile bounds, `secondDerivativeBound` for resampling, and a parameter written once a tick. What's missing, measured against the acceptance test:

- Normals don't turn with the placement.
- Rays ignore placements (`World.castRays` and the CPU terrain-pick fallback in `render/view/picks.ts`).
- Picks can't invert a non-rigid placement.
- Nothing recomputes a placement for a new root.
- The globe isn't a scene item, so it can't take a placement.
- LOD doesn't know a placement stretches error.
- There are no clip planes.
- Custom shaders get a placed `positionMC` with an unplaced `normalMC`.

_The model: true coordinates, then one drawn map._

- **True coordinates** are content after its coordinate operation and the frame tree. That is where content _is_, and every world question is asked there: distances, line of sight, clearance, volumes, scalar fields, section planes, b-rep queries.
- A reprojection belongs here. It's exact in float64 on the CPU (`DesignPlacement.displayed` and `designOf` are this). Its GPU fit is an approximation of truth, with an error bound: the existing `displayError`.
- **The drawn map** is applied last, in the vertex stage. It decides where content is _drawn_, never where it _is_: vertical exaggeration, design view's flattening, the 2D and 3D morph, exploded views.
- A world answer never changes when the drawn map does. That's the acceptance test's "measurements report true heights", made a rule.
- This also settles today's "rays don't see placements": it's right for world questions, and wrong for view questions.

_One placement interface, exact on the CPU and fitted for the GPU._

- A `PlacementMap` is defined in a named frame, with:
  - `forward`, `inverse` and `jacobian` in float64
  - `bounds(volume)`
  - `stretch(volume)`: the largest singular value of its Jacobian over the volume
  - a revision
- Both a coordinate operation and a drawn map are `PlacementMap`s. The application writes its maps. The engine composes them on the CPU, exact, and fits the composition per tile and per root: one cubic, as today's `FittedOperation`.
- The GPU keeps evaluating a single fitted term, or a blend of two, so the shader and the buffer don't grow and there's no chain to walk.
- Exaggeration by a factor k is `blend(identity, fit of h·n̂, t = k − 1)`, which exists today. The slider writes one float; nothing is refit when k changes.
- Two independent parameters at once, such as exaggeration during the 2D morph, refit when either changes. Measure that before designing more.
- The fit's error bound joins the tile's geometric error in screen-space error, so a coarse tile with a poor fit refines. That covers globe tiles near the root, where a cubic fits a hemisphere badly.
- **Dual positions leave the engine (owner, 2026-11-10).** A dual position isn't a map. It's per-vertex data: a second position the producer made, mixed by a parameter. That's application code over content: a custom vertex shader mixing `positionMC` toward a named attribute, which `CustomShader` already supports.
  - The attribute is declared vertex-only, so it costs no varying.
  - `displacement` declares how far it moves vertices, which pads the bounds.
  - A second normal attribute, if the producer wrote one, sets `normalMC`.
  - The parameter is the shader's uniform.
  - Picks need nothing from it: the primitive-index route below interpolates the content's own positions, so a pick reports the design point whatever the shader drew.
  - It's also glTF's morph target with one target, so when morph targets arrive (before the map, with skins) a producer can ship it that way instead.
  - `DualPosition` drops out of the closed set, which leaves maps only: fitted operations and their blends. `Tileset3D.dualPosition`'s metadata reading moves to the design globe example, with its shader. The example later moves to fitted operations.
  - The cost is accepted: the content can't be resampled, so it can't feed b-rep step 5 or curves. That's the same as today.

_What each layer owns:_

- **The frames layer:** coordinate operations, the frame tree, and a placement cache keyed by item, tile, root, and map revision. It refits on `routeRevision` and `watch`. This is the missing per-root hook of §7.2 step 3, so `DrawPlacementInfo.root` names a root that something was computed for.
- **Content:** true geometry in its own CRS, with metadata naming that CRS. Nothing is baked: "hosted" content declares that its producer reprojected it.
- **Items:** a placement per scene item. The globe becomes an item, or at least takes a placement, ahead of §13.25's full version.
- **The renderer:** the seam it has now, plus the Jacobian.

_Normals and tangents._

- The vertex stage evaluates the fit's Jacobian analytically: about 60 more multiply-adds, and no varying.
- It turns the normal by the cofactor matrix (det·J⁻ᵀ, so no inverse is needed) and the tangent by J.
- Exaggeration needs this, not just tolerates it: with k = 10, slopes are ten times steeper.
- A custom shader sees the placed `positionMC` and the turned `normalMC`, and `designPositionMC` in the vertex stage.

_Bounds, LOD, culling and shadows._

- Bounds go through `PlacementMap.bounds`, with today's padding as the fallback.
- Screen-space error multiplies geometric error by `stretch`. Otherwise k = 10 would draw terrain ten times coarser than its error allows.
- The horizon occluder is the map's image of the ellipsoid. Exaggerating heights above the ellipsoid leaves the ellipsoid where it is.
- Shadow casters already share the vertex path, so they follow the map.

_Picks, snaps and measurements: view questions answered with true points._

- The pick pass writes the primitive index beside the feature, using WebGPU's `primitive-index` feature where it's available.
- The CPU forward-maps that triangle's three vertices, intersects the camera ray with the placed triangle for barycentrics, and interpolates the true vertices. The result is exact on the content triangle, with no inverse, whatever moved the vertices: a map or a custom shader.
- Without the feature: depth, then Newton on `PlacementMap.inverse`. The answer is provisional, and its accuracy includes the fit's error bound.
- The CPU terrain-pick fallback tests placed triangles.
- The GPU snap pass (5f) works in drawn space, with its pixel tolerance there, and returns true points the same way.
- Measurements report true values, name their frame, and say when what was drawn was exaggerated.
- Their lines and labels are content in true coordinates, drawn through the same map. A straight true segment draws as a curve, sampled by the curves-through-placement path.
- `GeometryQueries` answer in true coordinates only. The pick refinement entry from the b-rep brainstorm (§13.33) takes a pick's (draw, primitive, barycentrics), or (face, u, v), never a drawn position.

_Clip and section planes:_

- They're defined in a named frame and transformed on the CPU into each draw's model space.
- They're evaluated per vertex on the pre-placement design position. A plane's distance is linear in true coordinates, so on a planar content triangle the interpolated distance is exact, whatever the drawn map does.
- They cost inter-stage budget: a varying, or WebGPU's `clip-distances` feature. Confirm what that feature draws from `maxInterStageShaderVariables` before choosing. Packing today's 13 user locations comes first.
- Caps are content in true coordinates, drawn through the map.
- Picks, snaps and queries test the plane on true points, in float64.
- A view-fixed cut is the other kind: it's in render space, for "cut away the near half".

_The other open items:_

- **2D and Columbus view:**
  - A whole-world flat map follows from design view's mechanism: a world-spanning CRS as the root, with globe tiles fitted per tile.
  - The 2D and 3D morph is a blend.
  - At the antimeridian, tiles are drawn twice with an instance offset of one circumference.
  - Columbus view is the same, with heights kept.
- **Instances:** applied before the map. A pool's fit spans every instance's bounds, and a pool splits by cluster when the fit's error bound is too large.
- **Skins and morph targets:** applied before the map, when animation arrives.
- **The tile format:** see "Content" above. A glTF 2.1 external asset carries its own CRS and transform, which the item composes like any coordinate operation.
- **Curves through placement and b-rep step 5:** both sample the exact source in true coordinates and evaluate the fit at points the content never had. Their error budgets take `secondDerivativeBound` and `stretch`.

_The acceptance increments, in order:_

1. `PlacementMap` and the frames layer's per-tile fitter and cache, with refits on a root change. `DualPosition` is removed, and the design globe example becomes a custom shader.
2. The Jacobian in the vertex stage, for normals and tangents.
3. Bounds through the map, `stretch` in screen-space error, and the horizon occluder.
4. The globe and terrain take a placement.
5. Picks by primitive index and barycentrics, with the Newton fallback; and the terrain-pick fallback placed.
6. Measurements and snaps in true coordinates, with their graphics drawn through the map.
7. An example, "Vertical exaggeration":
   - The application writes the height-scale map (about 40 lines), not the engine.
   - The scene has the globe, terrain, a tileset and measurements.
   - The tests read true heights while k goes from 1 to 10.
8. Clip planes on the design position, with caps.

Increments 1 to 3 come before b-rep step 5. Increment 8 comes with §13.34's capabilities (2).

**Brainstorm: one geometry interface, from domains, fields and maps (owner's question, 2026-11-10).** The question: is there one change to the abstractions that lifts the limits above, such as dual positions that can't be resampled and picks that need an inverse, without costing the main pass? A proposal for review. If accepted, it revises the dual-position bullet and increment 5 above.

_What the limits have in common._ Data is attached to _vertices_, not to _where on the geometry_ it is.

- A dual position can't be resampled because nothing says which point of the surface a vertex stands for. It's the same per-vertex data that resamples fine when it's tied to a domain.
- A pick needs an inverse because it reports a _position_, then has to work back to which geometry it hit. Report _which geometry_ instead, and the position follows.

_The model: every representation is a domain, an embedding, and fields._

- **The domain** is where on the geometry, as a discrete element plus continuous coordinates. Its value is a _domain point_:

  | Representation | Domain point                     |
  | -------------- | -------------------------------- |
  | Mesh           | (triangle, barycentrics)         |
  | B-rep          | (face, u, v), or (edge, t)       |
  | Curve          | (segment, t)                     |
  | Terrain        | (tile, longitude, latitude)      |
  | Points         | (point)                          |
  | Volume or SDF  | (cell, x, y, z), or just x, y, z |

  It's pbrt's `SurfaceInteraction` (a point with its uv, its derivatives and its shape), made the currency of the whole engine.

- **The embedding** takes a domain point to true coordinates. It's exact on the CPU in float64, and evaluable on the GPU with a stated error. A mesh's is linear interpolation; a b-rep's is its surfaces.
- **Fields** are values on the domain: colours, scalars, element IDs, normals, and _displacements_. This is RenderMan's and USD's _primvars_, whose interpolation classes say how a value is spread over the domain:
  - _constant:_ one value for the whole geometry
  - _uniform:_ one value per element (per face)
  - _varying:_ linear over each element's parameters
  - _vertex:_ through the geometry's own basis. On a NURBS surface that means the control points.
  - _faceVarying:_ per corner of each face

  §13.34's scalar fields (1) are fields. The styling language's run-time data by element ID (5) is a uniform field.

- **Maps** act on space, not on the domain: coordinate operations and drawn maps, as the review above has them.

_Two kinds of data, two meanings:_

|                               | Defined on space                                     | Defined on the domain                                      |
| ----------------------------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| Changes where content _is_    | A coordinate operation (a reprojection)              | A deformer for a state: 4D construction, a survey epoch    |
| Changes only how it's _drawn_ | A drawn map (exaggeration, flattening, the 2D morph) | A drawn deformer (an analysis shape at ×50); colour fields |

- Queries, clipping and measurement apply the first row only.
- The pipeline per sample: domain point → embedding → the deformers for its state (true) → the coordinate operation (true coordinates) → drawn deformers → the drawn map.

_What it lifts:_

- **Resampling.** A field on a continuous domain can be evaluated at any domain point, so GPU tessellation and curve sampling get it for free.
  - Dual positions become _morph targets_: displacement fields with a weight, the general glTF and USD mechanism, which animation needs anyway. The content carries the targets, and the application sets the weights. That's the owner's boundary, with no concept in the engine that is specific to dual positions.
  - A displacement in the geometry's own basis costs almost nothing. On a mesh it's a vertex attribute, which is today's dual position. On a b-rep it's three more components per control point, evaluated by the same de Casteljau steps as the surface. On a curve it's the same again.
  - A mesh's vertex data is linear over each triangle, so a measurement line draped over a morphed mesh samples it too.
  - Data on one domain doesn't move to another at run time: a producer refits analysis results onto a b-rep's basis, and states the error, as a representation error. Data on a tile's mesh changes with level of detail; element IDs don't. A b-rep's (face, u, v) is the same at every level, which makes picks and fields on b-reps stable across LOD.
- **Inverses.** Every draw path writes a domain point: draw, element, and coordinates. A pick, a snap and a field read then evaluate the embedding in true coordinates, exactly. No inverse of any map or deformer is needed. This is the _visibility buffer_ (Burns and Hunt, 2013), and nvdiffrast's `rasterize` then `interpolate`.
  - The one exception is ray marching (SDFs and volumes), whose domain is space itself. It marches in drawn space and evaluates the field at the map's inverse: one fixed-point step, `x − D(x)`, for a near-identity fit. Steps shrink by the map's `stretch`, the Lipschitz bound of Hart's sphere tracing.
- **One interface.** A representation adapter provides:
  - `evaluate(domainPoint, state)`: position, derivatives and accuracy
  - its fields
  - its queries, in true coordinates, each answer carrying its domain point
  - its draw path: fixed samples (meshes, points), generated samples (b-reps, curves, terrain), or ray marched (SDFs, volumes)

  `GeometryQueries` keeps its shape. What changes is that answers name their domain point, and the frames layer, not the adapter, owns placement.

_Cost: the main pass doesn't change._

- Domain points are written only by the pick and snap variants, which are separate pipelines whose other varyings are free.
- On meshes, in core WebGPU with no optional feature:
  1. The pick variant draws non-indexed, `indexCount` vertices, and reads each index itself. This needs `STORAGE` usage on index buffers.
  2. `vertex_index % 3` gives the corner, interpolated into barycentrics.
  3. `vertex_index / 3` is the triangle, passed flat.
  4. Losing the vertex cache doesn't matter over a pick's few pixels.
- Generated samples interpolate their (u, v), which is two floats. Points write their index.
- Morph targets cost one more attribute read per target per vertex, and only where they're present.
- Going further: a visibility buffer for the main pass too, re-evaluating attributes from domain points per pixel, would remove the varying budget as a limit altogether. That's a large change (MSAA, translucency, re-fetch cost); measure it before considering it, not as part of this.

_Names._

- "Fitted operation" is the engine's own coinage, not a term of art.
- In geodesy, the per-tile cubic is a _polynomial transformation_ approximating a concatenated coordinate operation. EPSG has "General polynomial" and "Reversible polynomial" methods; GDAL's approximate transformer is the same idea, interpolated linearly with a stated error.
- Twenty cubic terms in normalized offset-and-scale coordinates is exactly the numerator of photogrammetry's _rational function model_ (RPC00B).
- In graphics, a smooth map of space is a _warp_, and a polynomial one in Bernstein form is a _free-form deformation_ (FFD; Sederberg and Parry, 1986).
- Candidate names: `Warp` for the exact map (today's draft `PlacementMap`), and `BezierWarp` for its GPU form (today's `FittedOperation`). For the owner to decide.

_The non-linear math worth using:_

1. **The per-tile cubic in Bernstein form, as an FFD:**
   - The convex hull of its control points bounds displacement, Jacobian, `stretch` and second derivatives soundly. These are the same Bernstein bounds as `brep/bounds.ts`.
   - Neighbouring tiles can share boundary control points, so independent fits don't crack at tile seams. Today two fits may disagree there by up to twice their error bound.
   - A polynomial warp of a Bézier patch is again a Bézier patch, of three times the degree, so a placed b-rep or curve stays exact relative to the fit.
2. **A rational function model where the map has a projective part:** a cubic over a cubic. Oblique imagery and camera-like projections become exact, and strongly non-linear maps fit a coarse tile better, at twice the evaluation cost.
3. **A hierarchical B-spline lattice** (multilevel B-spline approximation; Lee, Wolberg and Shin, 1997) aligned with the tile tree, instead of independent fits.
   - It is C² everywhere, and only the cells that change get refit.
   - It costs 64 control-point reads against 20 terms now.
   - The trick of evaluating cubic B-splines in eight trilinear texture fetches (Sigg and Hadwiger, _GPU Gems 2_, chapter 20) is ruled out: hardware filter weights carry about 8 fractional bits, far too coarse for millimetres.
   - Take this only if seams or refitting show up in measurements.
4. **Slang's automatic differentiation:** `fwd_diff` of `placePosition` gives the Jacobian for normals with no hand-written derivatives. Confirm it on the WGSL target. The CPU twin uses dual numbers, and a test compares the two.
5. **Newton with that Jacobian** for the few inverses left: ray-march fallbacks, and depth-only picks.

_Lessons from the renderers:_

- **RenderMan:**
  - `displacementbound`: the bound is declared, not discovered. That's `maxDisplacement`, and `CustomShader.displacement`.
  - `Pref`: the reference position that textures and analysis stick to while the shape deforms. That's the true position.
  - REYES: split and dice in parameter space, then displace. That's b-rep step 5's order: sample the domain, then deform, then warp.
  - Deformation blur: time-sampled positions are morph targets keyed by time.
- **USD:** primvars and their interpolation classes for fields; `UsdSkel` blend shapes for morph targets. The owner leans towards USD's concepts (§13.25), so these are the names to use.
- **pbrt:**
  - Normals transform by the inverse transpose, as the cofactor matrix above.
  - Floating-point error bounds (the γₙ terms, carried as `pError`) turn our float32 noise estimates into sound accuracy terms.
  - `AnimatedTransform`'s motion bounds solve for where the derivative is zero over a time interval. That's how to bound a blend over a range of its parameter, such as a slider being dragged, instead of at one value.
- **Differentiable renderers:**
  - nvdiffrast's barycentric and triangle-ID buffer: picks as domain points.
  - Mitsuba 3 and Dr.Jit: forward-mode derivatives through the whole pipeline.
  - What we take: derivatives as a property of the pipeline, not hand-written per kind. That gives Jacobians for normals, and the sensitivity of a point to a placement's parameters. That sensitivity is what aligning a model to a site by optimization needs (§13.34's AR, 7).
  - What we leave: the gradients of visibility.

**Second review (Fable 5.2, 2026-11-10): adjust, don't replace.** The owner accepted the brainstorm, with `Warp` as the name for the exact map. An independent review then kept its core (float64-exact maps, a per-tile cubic on the GPU, picks as domain points) and found three reformulations that cut concepts, and gaps to close before increment 1. Its code citations were spot-checked. This is the current proposal: where it differs from the review or the brainstorm above, it wins. It is not locked until the owner answers the questions at the end.

_Three reformulations:_

1. **A warp is an edge of the frame graph, and "true" is not a layer.**
   - `Warp { from, to, presentation, revision, domain?, forward(p, out, jacobian?), inverse? }`. Without an `inverse`, the engine uses Newton.
   - `FrameResolver` gains `route(frame, base, seconds)`, which returns the rigid part, the presentation edges, the forward map, the accuracy and a revision. Today it returns a 4×4 only.
   - Coordinate operations and exaggeration are both edges. The acceptance test becomes: define a frame `exaggerated` over ITRF with the application's warp, and put the camera rig on it. Every item already routes to the root, so nothing is set per item.
   - "True" means any frame reached without crossing a presentation edge. A query names its frame, and the resolver refuses a presentation frame unless drawn values are asked for.
   - Design view's flattening is a change of chart, not a drawn map: spec §13.2 makes the engineering frame the root. The 2D morph blends two roots (spec §7.3).
   - Deformers fold into the embedding as `embed(domainPoint, weights)`, each target flagged presentation or not. That fixes an ordering bug above: a drawn deformer is a vector in content coordinates, so it can't be added after a non-rigid operation.
   - `bounds` and `stretch` leave the interface. The engine derives them from the fit's Bernstein hull plus its error, as `brep/bounds.ts` does, so an application's warp is `forward` alone.
2. **One GPU form: a weighted sum of displacement terms.**
   - p′ = p + Σ wᵢ·Dᵢ, with at most three terms. Each Dᵢ is a cubic or a vertex attribute.
   - It replaces `DualPosition | FittedOperation | PlacementBlend`. A blend, exaggeration (w = k − 1), and morph targets (which is what dual positions become) are all cases of it.
   - Two parameters need no refit. Exaggeration during the 2D morph is three terms with weights t, (k − 1)(1 − t) and (k − 1)t, because both charts are affine in height.
   - The order-0 term moves to the cull kernel as hi and lo parts, beside the camera-relative matrix it already writes per view. The vertex stage keeps orders 1 to 3: 19 rows.
   - Measured cost: about 22 reads and 200 float operations per placed vertex for one term with its Jacobian and cofactor matrix (the Jacobian alone is about 90 multiply-adds, not 60). Each further term on the same centre adds 19 reads and 57 multiply-adds. Unplaced vertices pay one compare.
   - The rows' unused `.w` carries one fitted scalar per tile for free: the true height for contours, or a curved section surface.
3. **Interpolate the true point, and reconstruct the drawn one.**
   - Two varyings (locations 4 and 8) both carry drawn positions, which `@builtin(position)` already holds.
   - Location 8 becomes the design `positionMC`, and location 4 the true camera-relative position. The drawn position is unprojected per fragment, in about 10 multiply-adds.
   - Interpolation is barycentric, so each fragment gets the true point at its domain point. Then:
     - Clip planes, clip boxes and terrain clip regions test true points per fragment. That needs no new varying, no optional feature, and works for any number of planes. `clip-distances`, already requested, becomes an optional optimisation.
     - Procedural textures stop sliding under a warp, as RenderMan's `Pref` intends.
     - The pick variant writes the true position, so the "depth, then Newton" fallback goes.

_Accuracy as an algebra._ Each stage is a pair (L, ε): its Lipschitz bound and its error. They compose as (L₂L₁, L₂ε₁ + ε₂). The screen-space error's "times stretch" and "plus fit error" are that one rule. A bound and 1σ are carried separately: today a fit's bound is "taken as 1σ" (`engineering/pickInterpreter.ts`).

_Flaws found, with fixes:_

1. **Bounds pad instead of moving.**
   - Each tile's sphere grows by `maxDisplacement` around its true centre: tens of kilometres at k = 10.
   - Selection measures distance to true volumes while the camera is in drawn space, so LOD comes out too coarse.
   - A parameter outside [0, 1] walks every draw each tick, and t = k − 1 always is. The blend's pad is 17 times too large at k = 10.
   - Fix: move the centre by the order-0 term in the cull kernel and pad by the residual only; run selection on drawn volumes; and have parameters declare a range, padded once.
2. **Fit error can't share geometric error's budget.**
   - Two neighbouring fits may disagree by twice their bound. Against a 16-pixel threshold that's a visible crack wherever there are no skirts, and refining the tile downloads content to fix a fit.
   - Fix: require fit error ≤ geometricError/64, which is 0.25 px at the threshold. Reach it with a small lattice of cubics per tile (cell = ⌊u·n⌋, the same reads), with a millimetre floor for leaves.
   - Shared Bernstein control points work only where tile faces are lattice planes of the fit's variable, and model-space tiles aren't. So drop the seam claim in the brainstorm's math item 1.
3. **Float32 constants.** The fit's constant is added in model space before the camera-relative transform, so two large float32 numbers cancel. The estimate is about 4 mm at a 36 km displacement, and 0.25–0.5 m for a whole-world flat map viewed at street level. Fix: the order-0 term in hi and lo parts in the cull kernel (reformulation 2), and keep the root on the chart the camera is in.
4. **There is no pick pipeline to vary.**
   - Picks today read the main pass's feature target and depth in a compute pass.
   - Fix: add a pick variant, culled to a frustum a few pixels wide, with the same discards and custom vertex stage. Its kernel returns (item, primitive, barycentrics) and the triangle's three stored positions from the vertex arena, so custom-shader draws and generated samples need no CPU mesh.
   - WebGPU's `primitive-index` is fragment-only and resets per instance, which is fine since batches draw as instances. It costs one inter-stage variable, so it's for the pick variant, never the main pass.
5. **Anchored content refuses placements.**
   - Billboards, points and instanced draws throw (`render/placements.ts`), and "instances before the map" shears each instance.
   - Fix: a granularity, `warpAt: "vertex" | "anchor"`, where anchor evaluates the route at the origin. It's the application's choice per item, and forced for billboards.
6. **The ray-march step uses the wrong bound.**
   - The Lipschitz constant of f∘W⁻¹ is 1/σ_min, not `stretch` (σ_max). Exaggeration by 10 leaves steps unchanged, and compression shrinks them.
   - Fix: state both, as [σ_min, σ_max], and divide snap tolerances by σ_min.
7. **Horizon culling.**
   - The occludee point is precomputed from true heights.
   - The occluder is the ellipsoid shrunk by the minimum height.
   - Both change with k, so recompute them from drawn bounds.
8. **Fitting on the main thread.** A warp written as a JavaScript closure can't run in a worker, and a root change refits everything. Fit lazily within a per-frame budget, with padded bounds until a fit is ready, and label a sampled error an estimate, not a bound.
9. **The clip-plane claim above fails across a non-rigid operation.** One composed fit hides the intermediate true point. Reformulation 3 gives the true point per fragment.
10. **Aerial perspective marches from the drawn position,** so at k = 10 mountains reach into thin air. It should read the true position, or the owner rules otherwise (question 2).
11. **Corrections.**
    - There are 13 user locations, not 12, and they're full along with three builtins.
    - Keep Slang's `fwd_diff` as a test oracle. The hand-written derivative is about 30 rows in the same loop.
    - `clip-distances` costs ⌈N/4⌉ vertex outputs and nothing on the fragment side, so eight distances fit today. `maxInterStageShaderVariables` defaults to 16.
    - Not yet confirmed: `fwd_diff` on the WGSL target, the Chrome version that shipped `primitive-index`, and `INDEX | STORAGE` usage on one buffer.

_Revised increments, replacing the list above:_

1. Routes and `Warp`, and the fitter, with lattice cells and a per-frame budget. Weighted terms replace the closed set.
2. The Jacobian for normals and tangents, with the varying swap (reformulation 3). Clip planes and caps became increment 8, decided below.
3. Drawn bounds in cull and selection, parameter ranges, and the horizon.
4. The globe as an item, and `warpAt` granularity.
5. The pick variant, and its kernel fetching the triangle.
6. Measurements and snaps in true frames, with their graphics drawn through the route.
7. The "Vertical exaggeration" example: the application defines a frame and a rig, nothing per item.
8. Clips and caps, as decided below.

Increments 1 to 3 come before b-rep step 5.

**Increment 1, in progress (2026-11-10).** Slices A to C are done. Each was implemented by a Sonnet 5.5 agent from a brief, against a contract committed first (`camera/route.ts`, `scene/warpTerms.ts`).

- **A, routes:**
  - `warpFrame(name, parent, { presentation, revision, forward })` defines a frame on a warp edge, and `FrameResolver.route()` returns its steps.
  - `resolve`, `motion` and `frameTransform` throw `NonRigidRouteError` across a warp.
  - `accuracy` adds a warp's σ in quadrature, and puts a bound in the note, never as σ.
  - `warpInverse` stops on a relative step, since a 1e-9 m residual is below float64 precision at Earth scale.
- **B, the fitter:**
  - `fitLattice` fits each cell by Householder QR on 5³ Chebyshev–Lobatto samples, and measures the error on a 9³ grid, so the error is an estimate.
  - With k = 10 exaggeration at Everest, a 10 km tile fits in one cell to 0.43 mm in 0.7 ms. A 1000 km tile reaches geometricError/64 with 4 cells (304 m) in 40 ms.
  - On 2,000 random points, the observed error is at most 0.85 of the estimate.
  - `WarpFitCache` keeps fits per key and root, returns the stale fit while a refit is queued, runs within a per-frame budget, and evicts the least recently used.
- **C, the GPU form:**
  - Draws place by up to three weighted terms in the table and the Slang. Public `Placement`s are converted by `termsOf`, so behaviour is unchanged.
  - One cubic term with one cell costs 23 row reads and 20 multiply-adds, against 22 and 20 before.
  - The placement spike passes on an NVIDIA Lovelace GPU, every vertex within half a pixel of the CPU twin: dual at t = 1.5, a fitted operation, and blends at t = 0.75 and −0.5.

- **D, the wiring:** the GPU spike (`spikes/warpRoute.html`) passes on an NVIDIA Lovelace GPU. Quads anchored in ITRF are drawn in a view rooted on a ×10 height warp, at scales 0, 0.4 and 1. Every vertex is within 0.06 px of `routeForward`, and a change of scale only rewrites the term's weight.
  - `CameraLayer` places an anchor across a warp by the route's affine part and marks it with the route (`View.anchorRoute`). A rig frame that crosses a warp to the root is refused, with a message.
  - `scene/world/warps.ts` is one context per world, for the root of its first view (the engine warns once if another view disagrees). It finds the draws under a warped anchor and holds each hidden until its first fit. It fits the route over the draw's bounding sphere (tolerance `max(1 mm, geometricError / 64)`), and applies the lattice as a term of weight 1 after the draw's own terms. A route term is read at the undeformed position, so with a morph it is first-order.
  - The engine runs the cache once a frame, 4 ms by default (`Engine.warpBudgetMs`), and stays awake while fits are pending.
  - A warp may carry a `scale` (a `PlacementParameter` is one). With one scaled warp, forward, followed by rigid steps only, the unit displacement is fitted once and the scale is the term's weight: a slider writes one float. Otherwise a change refits, as a revision bump does.
  - `frameRays` carries rays by `resolveRoute` and refuses presentation routes. `placementOf` reports the route and the fit's state.
  - Not yet: billboards, points and instanced draws are drawn at their anchor's affine place, unwarped. Selection, picks and ray casts still read undeformed bounds and depth (increments 3 and 5). Normals are not warped (increment 2).

**Increment 1 is done (2026-11-10).** The example is increment 7.

**Increment 2a is done (2026-11-10).**

- `placement.slang`'s `placeVertex` returns the position and the Jacobian J = I + Σ wᵢ·Jᵢ. A lattice's derivative is analytic, chained by cells/scale. Dual positions and morph targets add nothing, so under one a vertex keeps its stored normal.
- The vertex stage turns the normal by J's cofactor matrix and the tangent by J, keeping its sign. The CPU twin is `placeJacobianWithTerms`, tested against central differences.
- Cost for one cubic term with one cell: still 23 reads, 80 float3 multiply-adds against 20, and about 44 more for the normal and tangent.
- The varying swap. Location 8 is the design `positionMC`. Location 4 is the true camera-relative position, the draw's affine transform of the design position.
  - An unplaced draw's fragment uses location 4 as it is, bit-identical to before.
  - A placed draw rebuilds its drawn position from `@builtin(position)` and the view's rotation-only reverse-Z projection, in about 17 multiply-adds.
  - Still 13 user locations.
- For custom shaders, `fsInput.positionMC` is now the design position, as RenderMan's `Pref` is, and `vsInput.normalMC` is the turned normal. Slang playground presets that displace in `vertexMain` and read `positionMC` look slightly different.
- `spikes/placementNormals.html` passes on an NVIDIA Lovelace GPU, at k = 10 and then 4 (one float written, no refit), with the unplaced path held to the same checks. Turned normals are within 0.003° of the twin, and positions within 0.03 mm. The placement and warp-route spikes still pass.

**Increment 3 is done (2026-11-10).**

- A placed draw's culling sphere moves by Σ w̄ᵢ·Dᵢ(c), and grows by the residual: weight half-widths times |Dᵢ(c)|, plus |w|max times each term's bound on |Dᵢ(p) − Dᵢ(c)| and its fit error (`scene/warpBounds.ts`).
  - The record's centre and radius are rewritten through `DrawConstants.setBounds`, and `cull.slang` is unchanged. Unplaced records are never written.
  - At k = 10 a 400 m quad's sphere grows by 2.5 km instead of more than 20 km.
- `createPlacementParameter(value, { range: [min, max] })`. Bounds are made once over the range, so a change inside it writes one float and walks no draws. A value outside the range throws. Without a range, bounds follow the current value.
- Selection under a warped anchor uses drawn volumes (`World.tileWarp`, `streaming/tileWarp.ts`).
  - A tile's volume is sampled on a 3×3×3 grid, and the drawn sphere is padded for bulge by (1/8)·M₂·L², with M₂ estimated from Jacobian differences.
  - Screen-space error is geometricError × σ_max + fit error, with σ_max an estimate.
  - At k = 10 selection goes one level deeper than at k = 1. On a 200 km tile, 5,000 random warped points all land inside the drawn sphere, which is 4.9% larger than the 9-point sphere.
- Horizon culling is off under a warped anchor: its true-ellipsoid occluder says nothing about a drawn Earth.
- `routeSingularRange` gives [σ_min, σ_max], about [1.004, 10] at k = 10, for the ray-march and snaps later.
- Not yet on drawn volumes: shadow casters' selection, the viewer's request volume, and dynamic screen-space error.

**Gaps found writing the handbook's deep dive (2026-11-10).** These are for the next increments:

- Location 4 carries the position before the whole fitted route. It's the true position only when every warp crossed is a presentation warp. Second-review flaw 9's fix for mixed routes, a true point under a non-presentation warp, isn't built.
- The order-0 term isn't in the cull kernel as hi and lo parts, so float32 cancellation remains (second-review flaw 3).
- The lattice rows' `.w` scalar is unused (0).
- `warpAt` doesn't exist yet (increment 4).
- `Warp`, `Route`, `resolveRoute` and `NonRigidRouteError` aren't exported from an entry point. Only `warpFrame`, `WarpFrame`, `WarpSpec` and `isWarpFrame` are. They wait for the API review's names.
- A warp's `forward` must write its Jacobian when asked: Newton and σ estimates use it.
- The 1000 km tile's "4 cells" is 4 per axis (64 cells). The 0.7 ms was its one-cell fit. The 10 km tile's cold fit takes about 6 ms.

**Clip planes and caps: decided by the owner (2026-11-10).** Built as increment 8, once increments 2a and 3 have landed. 2a's varying swap provides the true point per fragment.

1. **A clip is a world object, defined in a frame, which views opt into by mask.** One section cuts federated content and moves with its frame. Clips per item can be added later if a need appears.
2. **Clips may be named in any frame, presentation frames included.** A plane drawn in design space, for example, stays where the user drew it when the scene is warped into another frame. Each clip is evaluated in its own frame:
   - If its route to the content's true side is rigid, it's tested exactly on the true point.
   - If its route to the root, the drawn side, is rigid, it's tested exactly on the drawn point, which is rebuilt per fragment.
   - If neither is rigid, the plane is curved in the scene. Its signed distance is fitted per tile, in the lattice rows' free `.w` channel that the second review pointed out: one clip per draw costs nothing, and more need rows. Its error joins the fit's.
   - Queries test clips in float64, by routing points to the clip's frame.
3. **Shapes:** planes, boxes and extruded polygons, which absorb today's `TerrainClips`. One loop over a storage buffer, so no shader recompiles.
4. **Combining:** union or intersection, keeping inside or outside, per clip set.
5. **B-rep caps are exact.** The cut through the solid gives planar faces with trimmed loops. These join the form as faces that can be tessellated, queried and picked. Curved cuts (case 2) give non-planar section faces, through the same path.
6. **Mesh caps are real geometry,** because content may be open meshes:
   - A compute pass cuts each tile's triangles by the clip and writes segments keyed by element ID.
   - Segments are joined into loops per element across every loaded tile, because a solid often spans several.
   - Closed loops are triangulated into caps. Chains that don't close are drawn as section lines instead of being filled, and a report says so.
   - Caps are cached per tile, clip and revision, and rebuilt within a per-frame budget.
   - Known gap: tiles at different levels of detail may not meet, so a loop can stay open until they settle.
   - B-rep caps are exact, and mesh caps are as accurate as the mesh's geometric error.
7. **Cap styling is the styling language's:** hatching per material or element, through §13.27's planar fill.
8. **Queries support both uses.** Every query takes `clips: "view" | ClipSet | "none"`. Picks and snaps default to their view's clips. World questions, such as distance, clearance and line of sight, default to none, and can pass a set.
9. **A plane can define an orthographic section view** looking at the cut (5d's orthographic camera), which leads to printing to scale (§13.34, 6).
10. **Exemptions are the styling language's:** run-time data by element ID, for example "don't clip the terrain". There is no exemption list per clip.

**Increment 2a, normals and the varying swap (2026-11-10).** Reformulations 2 and 3 of the second review, without the height lookup, which waits for the API review.

- **The Jacobian.** `placeVertex` (placement.slang) returns `Placed { position, jacobian }`, with J = I + Σ wᵢ·Jᵢ. A lattice's Jᵢ is the cubic's analytic derivative, chained by dv/dp = cells / scale. An attribute term (a morph target, a dual position) has no derivative in space: its Jᵢ is zero, so under one the normal stays as stored. `NO_PLACEMENT` is still one compare. `surface.slang` turns the normal by the cofactor matrix (`turnNormal`, no inverse, a fold keeps the normal on its side) and the tangent by J, keeping w. The twin is `placeJacobianWithTerms` in `scene/warpEvaluate.ts`.
- **Cost per vertex,** one cubic term, one cell: 23 row reads, as before. Multiply-adds: 80 float3 against 20 (the value and the three columns of J, each a float3 of the monomial's coefficient), and 7 scalar products per monomial against 2. Then about 35 for the normal's cofactor and normalize, and 9 for the tangent. Reads dominate; this is ALU.
- **The varyings, 13 user locations as before.** Location 8 is the design `positionMC`. Location 4 is the draw's transform on the position before the placement, which for an unplaced draw is where it is drawn, bit for bit as before. A placed draw's drawn position is rebuilt in the fragment stage from `@builtin(position)` and the view's `viewProj`, whose rows 0, 1 and 3 are orthogonal for the rotation-only perspective: `w · (right·x/|row0|² + up·y/|row1|² + direction)`, `w = near / depth`, camera-relative, no new view field. Billboards, the underlay and shadow and height-capture views (orthographic, with a window of their own) keep the varying. Clips (mixed-LOD boxes, terrain regions) stay on the varying: they are defined on the content as stored.
- **Custom shaders.** `fsInput.positionMC` is the design position, a Pref: a procedural texture stays on the surface under a warp, and no longer follows `vertexMain`'s displacement (carry that in a named attribute). `vsInput.normalMC` is the turned normal after a placement.
- Checked by `test/placementJacobian.test.ts` (central differences, cofactor against placed triangles, the unprojection in float64) and `spikes/placementNormals.html` on the GPU.

**Increment 3, drawn bounds, parameter ranges, selection and the horizon (2026-11-10).** Flaws 1, 2 (the error budget in selection), 6 and 7 of the second review.

- **A draw's sphere moves, then pads by the residual.** The cull kernel tests the record's `center` and `radius`, so the record carries the moved sphere and `cull.slang` is unchanged. The base centre and radius are kept on the draw's placement, and an unplaced draw's record is never written. For a term with weight in [w₁, w₂] (middle w̄, half-width ω) the centre moves by Σ w̄ᵢ·Dᵢ(c) (float64, rounded to float32), and the radius grows by Σ (ωᵢ·|Dᵢ(c)| + max|wᵢ|·residualᵢ), with the float32 rounding of the centre added and the whole rounded up. `residualᵢ` bounds |Dᵢ(p) − Dᵢ(c)| over the sphere plus the fit's `errorBound` (`scene/warpBounds.ts`, `latticeResidual`). Per cell the sphere's box touches, the polynomial is expanded about a point in it: the linear part counts the smaller of Σ|cₐ|hₐ and its Frobenius norm times the distance, orders 2 and 3 count |c|·(Π(|mₐ| + hₐ)^eₐ − Π|mₐ|^eₐ), and the exact |D_cell(m) − D(c)| carries a jump between cells. A tile fitted over its own sphere gets about the size of its Jacobian times the radius: the 400 m quad of `warpWorld.test.ts`, 3 km up at k = 10 and tilted 67° to the local horizontal, grew by about 20 km before and grows by 2.5 km now. An attribute term has no displacement at the centre; it pads by max|w|·`maxDistance`.
- **Parameters declare a range.** `World.createPlacementParameter(value, { range: [min, max] })`. Bounds of the draws reading it are made once, over the range (a weight is `scale × Π` of at most two affine factors: the extreme at a corner of the box of ranges, or at the stationary point of a quadratic when one parameter is used twice), so a change within it writes one float and walks no draw. A value outside the range throws a `RangeError` and keeps the old one, so a parameter never leaves what its bounds were made for. Without a range a change walks the draws that read it and recomputes their spheres at the value it has, as before. `Warp.scale` is a `WarpScale`, which may carry a `range` too; a world parameter used as a scale does, and selection's drawn volumes then hold for the whole range.
- **Selection on drawn volumes.** An anchor whose route crosses a warp has a `TileWarp` (`World.tileWarp(anchor)`, `streaming/tileWarp.ts`): the map `A⁻¹ · route`, from the anchor's coordinates to where they are drawn in them, where `A` is the anchor's place, so the camera, the planes and the distances stay as they are. `Tileset3D.update` puts it on each `SelectionView`. A tile's volume goes to its drawn bounding sphere (its centre and 8 corners through the map, cached on the tile per map version and fit version; the map's version moves with the route, or a scale's bucket of 1/64 when it has no range, in which case both ends of the bucket are carried), distance, the frustum planes and the content volume use that, and the screen-space error uses `geometricError × σ_max + fit error`. σ_max is the largest singular value of the Jacobian at those samples: an estimate. A route's Jacobian is composed from its steps' (`warpForward`), differenced for an inverse step. The globe is left alone, as are the viewer request volume, dynamic SSE and shadow casters, which still read true volumes.
- **The horizon.** Off for tiles under a warped anchor. The occluder is the ellipsoid shrunk to the volume's lowest height, which says nothing about a drawn Earth: at k = 10 the drawn heights differ, and under a general warp there is no ellipsoid. No occludee made from drawn bounds would be sound, so the frustum and the error decide.
- **[σ_min, σ_max].** `routeSingularRange(route, volume)`: about [1, k] for exaggeration by k (radially k, across it (R + kh) / (R + h)). σ_min sets the ray-march step and divides snap tolerances (flaw 6); not wired yet.
- Checked by `test/warpBounds.test.ts` (random placed points against moved spheres for lattices of 1, 2 and 4 cells and weights of two factors, intervals by brute force, σ for k = 10), `test/warpSelection.test.ts` (k = 10 selects a level deeper than k = 1 at the same camera, and the tile is culled where it is drawn; the horizon) and `test/warpWorld.test.ts` (a ranged scale writes one float and walks no draw; selection through the engine).

_Open questions for the owner:_

1. Should models and instances stretch per vertex or move per anchor by default?
2. Should aerial perspective, local lights and height-based styles read true or drawn positions?
3. May terrain keep (u, v, h)? Exaggeration and flattening would then be exact in height, with no fit along it.
4. Is accuracy reported as a bound, as 1σ, or both?
5. Is 0.25–0.5 m of imprecision in the middle of the 2D morph acceptable, given both ends are exact?
6. Should a "drawn distance" query exist, labelled as such?

**The owner's answers (2026-11-10).** These lock the second review, with question 4 provisional.

1. **Content stretches per vertex.** That is what reprojection means. `warpAt: "anchor"` stays for things that must keep their shape, such as a vehicle model, a symbol or a billboard. It's forced for billboards and points, and is an item's choice otherwise.
2. **Shading reads drawn positions, and lookups keyed by height read the true height.** The owner leaned towards drawn; this is the reasoning for the split.
   - A true height isn't drawn anywhere. It's a value the shader looks something up with.
   - Normals, shadows, light directions and distances, and the length of the path through air are geometry, so they're drawn.
   - A hypsometric tint, contours, a style's height thresholds and the air's density are lookups keyed by height. Keyed by drawn height, a legend reading 1,000 m would sit at 100 m of true height when k = 10, and an exaggerated summit would stand in near-vacuum.
   - Integrating the drawn path while reading density at the true height is the same as warping the atmosphere along with everything else. That is the consistent picture.
   - The true height comes from the free `.w` scalar (reformulation 2), or from the true-position varying (reformulation 3).
   - Not settled: whether the owner agrees. The owner wants to see it first: a spike comparing a tint and a height-based haze keyed to drawn and to true height, on an exaggerated terrain patch. It's deferred to the API review (5i), to be judged with the rest of the API.
3. **Terrain keeps (u, v, h).** Exaggeration and flattening are exact in height for terrain, with no fit along it.
4. **Accuracy: both, provisionally.**
   - A worst-case `bound` comes from fits, representation error, tessellation and float32 rounding. Bounds compose linearly, by the (L, ε) algebra.
   - A statistical `sigma` comes from the frames layer, surveys and ephemerides. Sigmas compose in quadrature, as `frames/pointAccuracy.ts` already does.
   - This fits what exists. `Confidence` already has `"max"` beside `"1σ"` and `"95%"` (`frames/frameAccuracy.ts`). `GeometryAccuracy`'s `meters` and `exact` become `bound` plus `sigma`.
   - What changes: no bound is "taken as 1σ" any more, as `frames/pickInterpreter.ts` does today. A report shows both figures, and never converts one into the other silently.
5. **0.25–0.5 m in the middle of the morph is acceptable** until it's shown not to be.
6. **A drawn-distance query exists,** named as one, in a presentation frame. Vector styling needs it: dash lengths, label spacing and symbol density in what's drawn.

**Names: "placement" retires as the umbrella term.** It has come to mean four different things: `SceneItem.placement`, a per-draw `Placement`, `DesignPlacement`, and `ModelPlacement`, which is a placed glTF instance. The new model's terms, with the standards' names beside them:

- **`Warp`:** a non-rigid edge of the frame graph, exact on the CPU.
- **`Route`:** the composed path from a content frame to the root. This is ISO 19111's _concatenated coordinate operation_ and PROJ's _pipeline_. `FrameResolver` already says `routeRevision`.
- **Warp terms:** the GPU form, an internal name.
- **`Georeference`** instead of `DesignPlacement`. That is the 3D Tiles and CAD term of art, and its modes map onto the new model: rigid is a rigid edge, reprojected is a warp edge, and hosted needs neither.
- **Scene items:** they attach to a frame, and their morph targets take weights: `world.add(tileset, { frame, weights })`. `ModelPlacement` becomes an instance, as USD names it.
- "Place" survives as an ordinary verb.

The renames themselves wait for the API review (5i). New code from increment 1 uses these names.

### 13.27 CAD display extensions, with the vector design (owner, 2026-11-08)

Do soon, designed together with vector drawing, because they overlap with it. `BENTLEY_materials_planar_fill`, `BENTLEY_materials_line_style`, `BENTLEY_materials_point_style` and `EXT_mesh_primitive_edge_visibility` are implemented in 1.x and not in 2.0 (noted in §11's CAD display extensions). Most of the CAD content in the catalog uses none of them: a scan on 2026-11-08 found none in `bim-design-model`, `aec-design` or `aec-site`. Test content: ion asset 4665927 uses `EXT_mesh_primitive_edge_visibility` (7 of 7 sampled tiles) and `BENTLEY_materials_planar_fill` (5 of 7). Add it to the catalog, with its license checked.

- **One line and point path:** line width, dashes, points and edges should share what vector drawing uses, rather than a second quad expansion. A material's line style and a style expression's stroke should reach the same shader, so `line_style` could read as a style.
- **Planar fill:** "behind" order for coplanar faces needs a depth or id approach. 1.x uses an id framebuffer (`PlanarFillIdFramebuffer.js`). 2.0 already writes a per-pixel feature id during the opaque pass, so §11 expects a later pass can apply the same-feature depth offset without that prepass. Check that holds with translucency.
- **Coincident surfaces are for the content or the application (owner, 2026-11-08).** The engine adds no general depth shift or tie-break. `BENTLEY_materials_planar_fill` is how content declares the order of coplanar faces, so any offset above applies only where a material asks for it. Asset 2464651 has coincident faces with no such extension: teal and grey triangles in one primitive at the same height, in every vertex. They fight in 2.0 and in 1.x, and that stays. A trial with a depth offset per feature cleared them at three views and was dropped.
- **Edges and curves:** edges are currently mesh data, so exact edges from curves can come later (§13.26).
- **Snap:** 1.x's `Scene.snap` prefers edges, and 2.0's snap should use these.

### 13.28 Water and sun glare, for a later rendering plan (owner, 2026-11-08)

**Water.** Reflections on the sea from orbit, and simulated waves up close. Quantized-mesh terrain can carry a water mask, and 1.x's documentation shows Cesium World Terrain requested with one (`requestWaterMask: true` in `createWorldTerrainAsync`). 2.0 doesn't request or decode it today: `TerrainSource` asks only for normals and metadata. Check the live `layer.json` before designing on it.

- **The mask:** one byte for a tile that's all land or all water, otherwise 256 by 256 bytes. That's about 76 m a texel on a level 10 tile at the equator. How deep it's available decides how sharp coasts get up close, so measure that first. A child tile below the mask's levels reuses part of its parent's.
- **1.x as the baseline, not the target:** `GlobeFS.glsl`'s `computeWaterColor` uses a mask, a scrolling normal map and specular from the sun. `Globe.showWaterEffect` turns it on.
- **From orbit:** sun glint in physical units belongs with the physical sky and exposure (5e). It's very bright, so it has to work with the meter's highlight guard.
- **Up close:** a compute-driven wave simulation suits WebGPU. What's open: how it fades in with distance, whether waves move geometry or only shade, what shore data it needs, and what a host application can replace.
- **Reach beyond looks:** the mask could also address the over-stated terrain error over open sea (§13.16's follow-up), which would save tiles. It adds up to 64 KB per tile before compression, so request it only when something uses it.

**Glare from the sun, if it can look non-cheesy.** What makes glare look cheap is mostly a sprite pasted over the image: fixed shapes, lens ghosts, and the same result whatever the scene does. So the test for this work is that it follows from the image:

- **From real luminance.** Glare comes from the HDR scene in nits, before tone mapping (§13.22), so it needs the sun's true luminance. Ruled in the sky and observer plan (ruling 1, following §13.32): the disc stays clamped in the image, and its energy comes from the light list, its true illuminance through the air times its visibility, in closed form. It should keep energy roughly conserved, and fall with exposure as the sun's share of the image changes.
- **Blocked by the scene.** A truss crossing the sun or the sun at the Earth's limb changes the glare per pixel, with no occlusion query and no pop.
- **Three parts, by what they do (read 2026-11-08, spike's measurements pending).** A veil from a mip pyramid of Gaussians, which sums toward 1/θ² and costs under a millisecond in Schneegans et al.'s "Smaller than Pixels" (Eurographics 2025): image-based, so occluders cut it per pixel. Spikes as a precomputed point-spread kernel drawn as a sprite on the brightest stars, the same result as convolving a point: what looks cheap is fixed artwork, not sprites. A full FFT only for capture or cinematics, as Unreal's documentation positions its convolution bloom. The spike on an M2 at 2560×1440: FFT 62 ms, spike sprites 0.13 ms, veil 2.8 ms, with veil plus sprites looking best. The usual reference is Spencer et al., "Physically-Based Glare Effects for Digital Images" (SIGGRAPH 1995), from general knowledge; read it before relying on it.
- **Choose what it models.** An eye and a camera differ: the eye's fine streaks and halo against an aperture's starburst. A spacecraft camera for the Artemis replay may want the second. Lens ghosts stay out by default.
- **Judge by looking.** The owner decides from renders of the sun behind station structure, at the limb from orbit, and low over water. Water's sun glint (above) goes through the same path, so the two should be tuned together.

### 13.29 Owner's calls for the later plans (2026-11-08)

- **Stars in 5e (owner's view of a screenshot, 2026-11-08).** They read as blurry, low-resolution dots, and the Milky Way as patchy blobs, most of all with the exposure raised. What the code shows: 86,000 points are read out of 1.x's 5 arcminute 8-bit map, with brightness assigned by rank; the background is 64² a face, about 1.4° a texel; and each star's splat has a halo of 5% of its light, sigma 3 CSS pixels. Directions for 5e, to test by looking:
  - **Better source data.** NASA's Deep Star Maps 2020 (SVS 4851) plots 1.7 billion stars from Hipparcos-2, Tycho-2 and Gaia DR2 as half-float EXR at 4k to 64k. Reading points out of it gives real fluxes, and what's left is a smooth background. Read NASA's and ESA's terms before relying on it: this plan records Gaia's catalog as CC BY-NC 3.0 IGO. It would come through the setup store rather than the repository (§13.24).
  - **Sharper points.** A tight core with real dynamic range, and glare only on what's bright enough, through §13.28's convolution instead of a fixed halo on every star.
  - **Two looks over one sky.** The eye (dark-adapted, close to colorless, a limit near magnitude 6) and a camera (long exposure, color, more stars, the Milky Way's structure, optionally a lens's spikes or streaks). The engine's physical values stay the same; a camera's look is its exposure and point spread.
  - **Finish removing the star exposure.** The public `View.starExposure` is gone, but the eye path still passes a fixed `EYE_STARS_EV100` (−3) to the sky shader's `starExposure`, which shows stars at that exposure wherever the sky behind them is dark, whatever the view has adapted to. It's why stars show beside the sunlit Earth from orbit, and it isn't physical. The sky and observer plan removed it (§13.32 moved it before 5b), so stars follow the view's exposure or the eye model alone, and decides by looking how to get stars in that view when wanted. The air's transmittance and sky brightness are physical; measure which stars show at twilight against naked-eye limits once the rule is gone.
- **Deep-sky objects and other sky light (owner, 2026-11-08).** Nebulae, galaxies and the Messier objects, where not too small or dim. Star catalogs don't hold gas or unresolved galaxies. Three layers to test: an all-sky emission and dust map in the background, for large structure; real images for a short list of showpieces (Andromeda, the Magellanic Clouds, the Orion Nebula, the Pleiades, Carina and so on), calibrated linear so each one's total matches its catalog magnitude, with its stars removed; and a catalog's shape and magnitude with a simple profile for what's only a few pixels. All in cd/m² under the same exposure, so the eye sees a smudge and a long exposure shows structure. They all sit at infinity, which holds across the solar system. Terms need reading per source, since survey images often restrict reuse.
- **Sky data during R&D (owner, 2026-11-08).** The prototype keeps new sky data out of everything it distributes, and how data ships gets decided later, after legal review. Terms read so far are unsettled for stars (ESA's Gaia and Hipparcos pages state CC BY-NC 3.0 IGO), so:
  - **Source-neutral engine.** The sky takes a data pack (points, a background, deep-sky patches, a manifest), with no knowledge of where it came from. Today's star map stays the default, so a checkout with no pack draws what it draws now.
  - **Local only.** A script in the repository fetches from the source and builds the pack in the setup store, on the developer's machine. No sky data, derived data or derived images in the repository, on a server of ours, in a library build, or in the handbook's file.
  - **A manifest that blocks by default.** Each pack names its sources, credits and a `distributable` flag, false until cleared. Builds refuse a pack that isn't, with a test. The Viewer shows the manifest's credits.
  - **Order of sources.** Start with what reads as most open: NASA and ESA/Hubble or ESO images. Hold raw Gaia and Hipparcos as an optional local path, off by default, until their terms are answered, since R&D inside a company may itself count under a non-commercial clause.
- **The star spike's decisions (owner, 2026-11-09).** (a) Data: the NASA map plus a catalog for the bright end, to start, under the R&D rules. (b) A tight core. (c) The world stays physical; the astrophoto curve is a programmable post pass, written in Slang on the graph, and serves as that interface's example. (d) The veil is in, also as a Slang post pass. FFT glare is out, too expensive. Spike sprites live in an example, not in the engine. (e) Sky cells and strips look best, but benchmark the drawing methods across GPUs before settling. (f) No deep-sky patches; they look pasted on.
- **Follow-up from those decisions, after the usage reset:** the built curve and veil are WGSL stages and the sprites are an engine `GraphStage`, so: make Slang post stages work, move the curve and veil onto them, move the sprites out of the engine into the `night-sky` example, drop deep-sky patches from 5e's scope, and run the cost page on other GPUs (Intel first).
- **Planets as points, then disks.** The planets aren't drawn yet, and the ephemeris pack holds only the Sun, the Earth-Moon barycenter and the Moon. Add their barycenters from DE440, magnitudes that follow phase and distance, and a point at ordinary fields of view (Jupiter is under a pixel at about 0.03° a pixel), growing into an impostor when a long lens resolves it, on 5c's impostor path. A view of Orion with a planet nearby should use a real date, found from the ephemeris.
- **Entity is retired as an engine concept; its ideas stay.** 2.0 has no `Entity` class or data-source layer in the engine. What people use Entity for (a time-varying property, a clamped label, a track with a path) is covered through scene items, styling and 5d's time-bound values (`Timeline.bind`). Exact names and any compatibility layer belong to the vector design and the API review (5i).

### 13.30 Sketch: a gallery example for the sun and sky model (owner, 2026-11-08)

A Dyno example of beauty shots with presets, showing off the physical sky and driving the features it needs. A sketch, not a plan.

**A preset is data:** a place, a time, a lens and camera, the air (aerosol type and visibility), a look (eye or camera), and content. Times are solved rather than typed where they can be: the Sun's azimuth along Manhattan's grid gives Manhattanhenge's dates, checked against published ones. Each preset shows what's real about it, what's modelled and what isn't, in keeping with the handbook's rule.

**Shots to try (dates and facts to confirm from sources):**

- **Sunrise and sunset:** Manhattanhenge, Stonehenge's solstice sunrise, Angkor Wat at the equinox, the Grand Canyon, alpenglow on Everest.
- **The air:** one place across the aerosol types (continental, urban, maritime, desert) and a range of visibility: a clean mountain morning, a hazy city, a desert dusk, a sea sunset. The Belt of Venus and the Earth's shadow at twilight.
- **The Moon:** a moonrise behind a skyline through a long lens, with its true size.
- **Eclipses (owner):** a total solar eclipse from the ground, with stars and the Moon's shadow; the same shadow crossing the Earth from orbit; an annular eclipse; a total lunar eclipse, the Moon lit red by every sunset on Earth at once. Real dates from the ephemeris. The research found the zenith two to three orders too bright with today's sky terms, and the lunar one needs light refracted through the Earth's atmosphere, so both need work of their own.
- **Astrophotography:** the Milky Way's core over a dark site, Orion with a planet, the zodiacal light, star trails.
- **From space:** Earthrise (Apollo 8, 1968), the Blue Marble, the limb with airglow, the terminator over mountains, city lights from orbit, and Artemis II's views, whose trajectory we already have.
- **Balloons:** a mass ascension at sunrise, in the manner of the Albuquerque International Balloon Fiesta: Cesium's balloon model instanced by the hundreds at varied heights and tints, over the Rio Grande valley with the Sandia Mountains behind, in low golden light with long shadows. Also Cappadocia. It shows instancing, shadows and the air together.
- **Aurora:** from the ground and from orbit.

**What it needs:**

| Feature                                | Where                 | Why                                                                                               |
| -------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| Moon tileset loading                   | 5c                    | Earthrise, lunar sites                                                                            |
| Camera moves, long lenses, preset rigs | 5d                    | Moving between shots, the Moon's size                                                             |
| Planets, deep sky, the shutter         | 5e, §13.29            | Astrophotography. Stars, the eye and camera looks, and glare are built (sky and observer plan)    |
| Glare and sun glint                    | §13.28                | Sunsets, the sun itself                                                                           |
| Water, reflecting the sky              | §13.28                | Sea sunsets, reflections                                                                          |
| A wider ephemeris pack                 | Data                  | The pack covers 2000 to 2050, and Earthrise and the Blue Marble are earlier; `de440s` covers them |
| Clouds, at least a 2D layer            | Not planned yet       | A sunset without clouds is a thin picture                                                         |
| Crepuscular rays                       | Volumetric fog, later | Optional                                                                                          |
| Aurora                                 | New module            | Below                                                                                             |

**Aurora, a first idea.** Emission only, with no scattering to solve, so it's cheap: a compute pass evolves a 2D field of curtains around the geomagnetic oval, and the sky marches a shell from 100 to about 300 km through it in a constant number of steps, at reduced resolution, adding green low (557.7 nm oxygen), red high (630 nm oxygen) and a purple lower edge. The air's transmittance dims it, and it's in cd/m² under the same exposure. A self-contained module, loaded only when used.

**Limits to keep in mind:** Google's tiles are live-stream only here: publishing images isn't cleared, so presets using them stream with attribution and no stills go in the handbook. Sky data follows the R&D rules in §13.29. Content for specific sites needs its own license check.

**Clouds are in scope (owner, 2026-11-08),** and need a design of their own: a sunset's look comes from clouds lit from below by a low sun, which a 2D layer can't show well.

**Cloud types (owner).** The gallery wants many looks, so a preset needs to name what's in the sky: WMO's genera and useful species, at altitudes and with structure that's right for each. Research is under way, on how production systems encode type and which clouds need another method, such as thin ice clouds. Report: `.superpowers/reports/Clouds and crepuscular rays.md` (untracked).

**Fog (owner).** Today the sky has haze only: one aerosol layer with an exponential profile (scale height about 1 km), set by visibility and type. The plan's "weather haze" isn't built. Real fog differs: droplets scatter nearly neutral light, a fog layer has a top, it sits in terrain, and at under 1 km visibility multiple scattering dominates, which the sky model isn't checked for. Three cases to try, to be designed with clouds: thin mist or dust as a spectrally flat medium in the march; a layer with a sharp top, following an inversion, for a marine layer; and valley fog as cloud at ground level, sharing the cloud function, using height above the terrain. Shots: a sea of fog with peaks through it, a marine layer through a bridge, shafts through forest mist.

**Shutter time, for star trails and more.** `View.exposure` today is one number, with no notion of duration, so a long exposure needs a camera shutter with a length. How to draw it is undecided: accumulating renders in HDR across the shutter is the physical path and takes many renders, and drawing arcs analytically is cheap but the owner doubts it's physical and expects it to interact poorly with the rest of the system. Think it through when 5e gets there. Real-time motion blur from a velocity buffer is a separate effect (§13.22).

**Order:** a first slice can use what exists today (sky, aerosols, visibility, Moon and its phase, moonlight, city lights, exposure, solved dates). The rest grows as 5c, 5d, 5e and water land. Clouds and aurora are decisions of their own.

### 13.31 Sketch: an orbits example (owner, 2026-11-08)

A Dyno example of what's around the Earth: a database of satellites and near-Earth objects, with their orbits. It would use the live points path of §13.11 for tens of thousands of objects, propagated from a catalog: published orbital elements for satellites (for example CelesTrak or Space-Track, with SGP4) and JPL's small-body data for near-Earth objects, heliocentric rather than Earth-bound, so reference frames matter here. Orbits as lines lean on the vector design. Terms and fetch limits need reading per source, and data follows §13.29's rule: fetched, not shipped.

### 13.32 Unifications across the sky, light and points (owner, 2026-11-08)

Read together, the recent sketches (§13.22, §13.28, §13.29, §13.30, §13.31, 5c and 5d) keep solving the same problems. These are the owner's chosen directions, not designs: each needs its own design and a check that it holds up, and nothing here is built. Names are placeholders.

1. **Everything in the sky is a medium.** Air, aerosols, haze, fog, clouds, shafts and aurora share density, scattering, absorption, phase and emission as functions of position, in one description: a stack of media, with aerosol types, cloud genera and fog kinds as presets. Aurora is mostly emission. One visibility term toward each light shadows the air, whether the occluder is terrain, cloud or the Moon. The same description feeds the real-time paths and the reference path tracer, so a new medium gets a reference with it. It's a shared description and not a shared shader: the sky tables and the cloud march stay separate paths, and today's five single-scattering sites must all take the shadow term.
2. **One observer owns light to pixels.** Exposure, the meter, shutter, glare, spikes, tone mapping, the eye's model and a camera's look live together on a view, replacing the separate exposure settings and what's left of the star exposure rule. It's the backbone of §13.22's graph, and its parts are the first built-in stages. **The simulated world stays physically correct (owner, 2026-11-08):** taste belongs to post-processing, never to the scene. An astrophoto look is a tone curve in the observer's chain, after the meter, over the whole image, so stars, Earth and clouds all go through it. It's labelled as a look. The star spike's stretch of the background inside the sky shader is not to be carried over.
3. **Everything bright is a photometric light in a list.** Sun, Moon, stars, planets, emission in nits and city lights share one unit and one exposure. Glare's source list is this list filtered by brightness, so the sun's energy comes from the list and not from clamped pixels.
4. **One refinement rule, by pixel footprint.** Tile selection, imagery levels, the Moon's impostor to tileset, a planet from point to disc to tileset, stars from points to background, and clouds from volume to shell to layer are one decision: screen-space error. Sky objects can be scene items with level-of-detail chains, each stating its error.
5. **One point pipeline, the start of the vector pipeline.** Stars, live tracks, satellites, point clouds and small symbols are columnar rows of mostly sub-pixel points, sharing one store and one compute rasterizer where it measures better. Vector rendering grows from this: symbols and glyphs as instances over those rows, with handles over rows taking Entity's place (§13.29). Measure before committing. The star spike's first data point (M2, 530,000 stars, 2560×1440, wide): instanced quads 3.6 ms, 4-vertex strips 2.5, compute culling of sky cells 0.8, cells plus strips 0.7, compute splatting 2.7 to 3.1. So at this count on this machine, culling pays and compute splatting doesn't. "Smaller than Pixels" reports the reverse at 50 million stars on an RTX 4070 Super, so it may turn on count and GPU; check it on Intel.
6. **Time and data are inputs.** Scene state is a pure function of scene time (ephemerides, clouds, `Timeline.bind`), which makes scrubbing, dated presets, multiple views and long exposures deterministic. Data packs share one manifest (source, credit, `distributable`, what's modelled), feeding credits, the gallery's "what's real" card and the build check.

**Supporting pieces.** Graph resources: passes declare reads and writes, history included, so clouds, shafts and any upscale share one temporal mechanism and its reset rules. Budgeted, sliced GPU work: the hang risk applies to every heavy pass, so slicing belongs to the graph.

**Accumulation is optional, and off by default (owner).** Accumulating over time is one mechanism with several uses: long shutter, motion blur and other long-shutter effects, progressive refinement when the view is still, and later path tracing support, where the reference tracer is the first step. Each is configurable and off by default, with a stated cost, and turning one on never changes what the default path draws.

**Path tracing as a pluggable renderer (owner, 2026-11-08; to think through).** It sits next to the rasterizing renderer rather than next to WebGPU: §13.17's renderer interface is the same seam a WebGL 2 renderer would use, and a tracer can run on WebGPU compute, since WebGPU has no ray tracing. Loaded as its own chunk, it costs nothing when it's off. What it implies:

- **The contract.** A renderer takes a scene description and a view and gives linear HDR light, with depth, ids and whatever else stages read. The observer turns that into pixels, for either renderer, so exposure and glare match between them.
- **What must be renderer-neutral:** materials, the media stack, the light list, placements, and scene items. Draw records, culling and pipelines stay inside the rasterizer. Geometry already sits in storage buffers, which a compute tracer can read.
- **Custom shaders are the hard part.** A surface stage could compile to a callable function; a vertex stage or anything that assumes rasterization can't carry over. A renderer declares what it supports, and an unsupported feature says so, rather than silently dropping.
- **Streaming.** Secondary rays see what's outside the view, so tile selection can't follow only the camera, as shadow casters already found, and each tile needs a BVH within the budget.
- **Time and accumulation.** Samples taken across a shutter are natural here, given scene state as a function of time, and rendering becomes progressive: a view reports its samples and restarts when the camera moves. A per-view choice lets one view rasterize beside one that traces, which is also the comparison a reference needs.
- **Queries.** Picks and heights stay independent of the renderer, through the ray seam.

Don't build the interface until a second renderer needs it: the second pass only keeps scene data and rasterizer data apart, so the seam can open later. Two consumers (a tracer and a WebGL 2 renderer) will shape it better than guessing at one.

**Order.** The second pass of the file split comes first, since its contexts and passes are the seams these plug into: it should be designed with this section open. Then, before 5b (owner, 2026-11-08), a sky and observer plan, so the API has moved before 5d and 5e build on it: the observer stage on a first version of §13.22's interface, the sky data pack, star drawing, glare, and removing the fudges. Planets, the shutter and deep sky stay in 5e. The medium stack follows from the `sky-measure` results (branch `sky-measure`, 2026-11-09, against the reference path tracer, RGB rather than per band): single scattering agrees within about 3% along the twilight antisolar vertical, and the error is in the higher-order term. It's good at 1 and 2° of depression in clean air, but at 4° it's 72 to 112% too bright in the band and the dark band vanishes, and worse in V20 haze. Under shadow, unshadowed higher-order light is fine only for narrow shadows or clean air (median +39%, +85% at V10), and no fixed blur of visibility works, so it needs a term set by shadow size against mean free path: a first try, scaling by the shadow's first-order share, gets 22% rms. Shaft contrast peaks near V20 but doesn't collapse at V10. The eclipse case wasn't measured. and the point pipeline from the star measurements.

#### Sky and observer results (2026-11-09)

What the sky and observer plan (`docs/superpowers/plans/2026-11-08-sky-and-observer.md`) built, measured and ruled. Task 18 (FXAA on the interface) was skipped.

**Built.** `view.observer` (exposure in EV100, tone mapping, point spread, glare, stages); a first public post-stage interface; the astrophoto curve as a labelled look; a sky data pack (manifest, points, background) that builds refuse unless cleared and that the Viewer credits as text; `npm run sky` to build one locally; stars as strips from sky cells culled in compute, with the eye's faint-star limit as a model stage in place of the star exposure rule; glare as a light list, a veil and spike sprites, in tiers; the observer panel and the night-sky example; the cost page.

**Measured, on an M2 at 2560×1440** (`bench/observerCost.html`, synthetic 530,851 stars, five runs of nine renders; `.superpowers/reports/sky-observer/batch-e/observerCost-m2.json`):

- Star quads 3.1 to 3.7 ms (the spike: 3.60). Cells by indirect draw 0.6 to 1.9 ms; by the CPU path 0.5 to 1.5 ms (the spike: 0.66, on a sparser view; the dense band at the core is 1.9). Strips alone, with no cells, 2.7 to 4.9 ms, no faster than quads here: this is a tile-based GPU with additive blends, and the spread across runs is wide.
- Glare, with the sun in view: the veil alone about 1.7 ms of the frame; spikes about 2.5 ms (the spike's 0.13 ms was at 1024²; at this size the sprites' overdraw shows); `sources` 3.7 ms, `reduced` 4.3, `full` 4.4, against 3.2 with glare off. A pass's time on this GPU can land in the one before it, so read these as a frame's difference.
- Stages: a stage that returns its input costs 0.2 ms in `scene`, 0.6 in `exposed` and 1.3 in `display`; the astrophoto curve 0.8 to 1.0 ms.
- The eye's faint-star limit: 3.9 ms.
- Twilight (Batch C): with the rule gone the eye shows no star at 6° of depression, 4.5 and 5.0 magnitudes at 12°, the same at 18°. The model's sky at 12° is about as dark as at 18°, which is the wide miss against naked-eye limits.

**Rulings (one line each; the ledger has the rest).** The disc stays clamped and its energy comes from the light list (ruling 1). Stage uniforms are values only; a stage that fails to compile is skipped with one error. FXAA, if built, runs after display stages. The veil's levels join from the top, one bicubic each, at half size. The eye's limit compares with the second brightest of its ring. A strip reaches 3.5 σ plus half a pixel. The glare walk keeps the sun and 255 stars. A target keeps its texture from tick to tick, so its bind groups do too. The eye's "adaptation" pass reads glare's image when glare is on. Magics are built from char codes so no pack's name is in built output. Dyno's Viewer and the playground run EV100 sliders right for brighter.

**Intel.** Not run: it needs the owner's laptop. The cost page and `spikes/gpu-check.html` are ready; `glareTier`'s table, §13.23's adapter and driver, and this section's Intel figures are owed. Until then Intel starts at `reduced`, and above 3.7 million pixels at `sources`. To run it from the laptop without a checkout there, serve the page from this Mac's dev server and tunnel to it (`ssh -L 5196:127.0.0.1:5196`), then open `127.0.0.1:5196` in the laptop's Chrome: localhost is a secure context, so WebGPU works, and `?pack=local` reads the Mac's pack.

### 13.33 B-reps and a geometry query interface (owner, 2026-11-09)

**Decided to plan.** Not designed in detail or built. The engine evaluates exact geometry but never models it: booleans, fillets, healing as an edit, feature history and constraints belong to the application, or to a kernel it brings. Builds on §13.26 (curves through placement), §13.27 (CAD display), §13.20 (editing), the tessellation design input in §13.14 and the vector design.

**One query interface for every representation.** Meshes, b-reps and implicit surfaces (f-reps) each answer the same queries, and every answer states its accuracy: bounds, ray hit, closest point and distance, topology (face, edge and vertex IDs), and display at a tolerance. A mesh is the case where the exact and displayed geometry are the same, so today's picks, snapping and measurement move onto it first with no change in results. Every query names its reference frame and instant, as the ray-query seam in §13.14 already requires. F-reps are designed in from the start and built later: answers come from the distance field, and they draw by ray marching bounded by a constant step count, writing depth.

**One render b-rep form, produced two ways.** The engine defines its own form, as custom shaders take precompiled WGSL or Slang compiled at runtime:

- **Tiles:** a glTF 2.1 extension (a draft, for 3D Tiles 2.0) carries the render b-rep beside a fallback mesh, so a client without the extension still draws. Coarse tiles can stay plain meshes, with exact b-reps only at the finer levels. The tiler converts offline.
- **Host, kernel-neutral:** `World.addBrep` (a working name) takes the form as typed arrays. An application with its own kernel writes it directly and loads no WebAssembly.
- **Host, batteries included:** `BrepSource.fromUsd` (a working name) converts USD BRep or NURBS through SMLib built to WebAssembly in a worker, imported only on first use.

The form: analytic surfaces kept as they are (plane, cylinder, cone, sphere, torus); NURBS, split into rational Bézier patches by the loader in TypeScript (exact, no kernel); trim loops in each face's parameter space; face, loop, edge and vertex tables, each edge with its exact 3D curve and its two faces; stable source IDs for every entity; per-entity tolerances as accuracy terms; and a content version.

**SMLib's jobs** (NVIDIA's USD BRep, Apache 2.0, includes SMLib; noted in §13.14): conversion from what applications export, including surfaces that aren't NURBS (offsets, sweeps); healing; surface intersection for sections and clashes; and a reference tessellation to test the GPU path against. Never in the core.

**View-based GPU tessellation from the start,** in the one tessellation engine §13.14 describes:

- **Edges first.** Each topological edge is tessellated once at the view's tolerance, and both faces take their boundary from it, so faces don't crack apart. This is the vector pipeline's curve refinement.
- **Patches by screen-space error,** evaluated with the draw's placement in compute and drawn with indirect draws.
- **Trims per pixel.** The patch's whole parameter domain is tessellated, and the fragment stage tests inside or outside the trim with the same per-pixel coverage of quadratic curves the vector fill uses, in (u, v) instead of on screen. Exact, antialiased trim edges, no trim textures, no triangulation on the CPU, and a cap on curves per band as for glyphs. Each face's trim comes from its own parameter space, so pixel slivers along shared edges are possible: cover half a pixel extra, and draw edges on top.
- **Planar faces** are vector polygons on a plane: one quad and the coverage test, while the placement is close to affine over the face.

**What b-reps and vectors share:** the curve pipeline (exact source, placement, quadratic segments with an error bound, refined by view) for vector lines and outlines and for b-rep edges, silhouettes, sections and trims; per-pixel fill coverage for polygons, glyphs and trimmed faces; stroke styles for vector strokes and CAD edge styles (`BENTLEY_materials_line_style`); feature IDs and picking; and the exact source kept for snapping. Curved-surface tessellation is shared with reprojected meshes instead. Design the fill and curve kernels once, in the vector design.

**Exact queries, mostly without a kernel.** The winning pick fragment writes the face ID and (u, v). The CPU evaluates the surface there in float64 with one Newton step, so a pick is exact with no ray-surface solve. Closest point and ray hits: closed form on analytic surfaces, subdivision and Newton on Bézier patches in a worker. The kernel only for intersections, healing and conversion.

**Queries answered by a server,** as one of the host application's own services behind the same interface:

- **In stages:** the client answers at once from what it has, exact if exact data is loaded, otherwise provisional with the tessellation's chordal error stated. It then asks the service with the stable entity ID, the ray, a tolerance in meters and the reference frame and instant, and upgrades the marker without a jump when the answer arrives. Answers are cached per entity, and a moving cursor aborts stale requests.
- **Two kinds of service, both allowed:** answers on demand (the server holds the kernel: proprietary or huge data, sections, clashes, areas and volumes), or exact data on demand (the server returns the one element's b-rep and the client evaluates it).
- **The tiles must carry** stable source IDs for elements, faces, edges and vertices, not only tile-local feature indices, and a content version, so an answer from a newer model is detected.

**Editing.** Modeling, undo, persistence and collaboration are the application's. The engine shows changing geometry fast and correctly:

- **Overrides on tiles:** an edited element hides its tiled version by stable ID across every tile that holds it and draws a live version, until republished tiles replace it. This is how edits coexist with immutable tiles (§13.20).
- **Incremental updates** at face granularity: only changed patches upload, and the GPU re-tessellates them on the next tick.
- **Transient geometry** for drag previews and handles, with picking optional.
- **Queries see the edit,** live geometry and tiles both, excluding the element being dragged.
- **Stable topology names** from the kernel, carried rather than invented, so a selection survives an edit that splits a face.

**Reprojection, for b-reps and vectors together.**

- **Evaluate in source coordinates, then place** each evaluated point. Subdivision measures error after placement, including how far the placement bends across a patch.
- **Normals** are the surface's derivatives times the placement's Jacobian: exact, which avoids the dual-position normal error in §13.26.
- **Trims and fills are tested in intrinsic coordinates,** (u, v) or the source plane, which reprojection can't change. The rule for both: tessellate the domain by curvature plus placement error, test coverage in intrinsic coordinates. A large planar face under a non-rigid reprojection isn't planar once placed, so it subdivides; its coverage test doesn't change.
- **Quadratic segments are made after placement,** with their error measured there; snaps and measurements go back to the exact source.
- **Measurements name their reference frame:** a distance in design coordinates and on the ground differ by the projection's scale factor.

**Subdivision surfaces (owner, 2026-11-10).** Another representation for the same query interface and tessellation engine, planned, not designed. A subdivision surface is a control mesh (Catmull-Clark for quads, Loop for triangles) whose limit surface is smooth. They matter here because USD meshes carry a subdivision scheme, and Catmull-Clark is the default, so content from USD and from most modeling tools may mean a smooth surface while storing a coarse mesh. How it fits:

- **Drawing:** on regular faces the Catmull-Clark limit surface is a bicubic B-spline patch, so it converts exactly to Bézier patches and draws through step 5's patch path. Faces at extraordinary vertices need adaptive subdivision toward the vertex, or an approximating patch with a stated error. Creases, corners and boundary rules (as OpenSubdiv defines them) change the patches.
- **Queries:** exact limit-surface evaluation at (face, u, v) (Stam's method, or the patches above), so picks, closest points and normals are exact, with accuracy stated where an approximating patch is used.
- **Input:** USD's subdivision attributes on meshes; glTF has no standard for it that this plan relies on. A fallback mesh stays the coarse cage or a pre-subdivided level.
- **Open:** whether to use OpenSubdiv (its licence, its size in WebAssembly) or write the patch conversion in TypeScript, and whether the tessellation engine evaluates subdivision patches directly or only through Bézier conversion.

**Order.**

1. Spike: SMLib in WebAssembly (size, startup, threads, exceptions; converting a USD BRep sample to the render form). Done for the kernel; see the result below.
2. Spike: one trimmed NURBS face on the GPU (tessellation by screen-space error and the per-pixel trim), against SMLib's tessellation for accuracy and cost. It also tests the shared fill idea. Both spikes are decision tools. Done; see the result below.
3. The query interface, with the mesh adapter and an f-rep slot.
4. The render b-rep form and the glTF extension draft, with the TypeScript loader and analytic surfaces.
5. The GPU tessellation engine: edges first, patches, planar faces as fills. Preceded by the placement review (§13.26), so it builds on one model of a placement.
6. Trims and edges on the shared vector kernels, from the vector design.
7. Exact picks, snapping and measurement, then the server-backed queries.
8. SMLib as a module: `fromUsd`, healing, sections.
9. The tiler: USD BRep to 3D Tiles 2.0, coarse levels as meshes; overrides for editing.
10. F-reps.
11. Subdivision surfaces, through the patch path of step 5 and the query interface.

**A solid modeling sample with CSG (owner, 2026-11-10; start 2026-11-13).** A second B-rep example beside "B-reps: a first look": a small CAD tool whose interface is a CSG tree, showing the division above, where the application owns modeling and the engine draws and queries the result. Two kernels behind one small interface, with a switch between them (owner, 2026-11-10): SMLib in WebAssembly (Apache 2.0, about 1.1 MiB, its booleans and fillets already in the spike's build) and Open CASCADE (OCCT) through a WebAssembly build such as opencascade.js. Two kernels feeding one `BrepForm` show that the form is the engine's own, not shaped around one kernel: the kernel-neutral path above, demonstrated.

- **The kernel interface:** make a primitive, transform it, apply a boolean, convert the result to `BrepForm`, and say which input each output face came from. The tree, picks and editing use only this.
- **What OCCT adds:** STEP and IGES import, so real CAD parts load and draw exactly, which only OCCT offers here; and a kernel people know from FreeCAD and CadQuery.

- **The tree:** primitives (box, cylinder, sphere, cone, torus) with parameters and transforms as leaves; union, difference and intersection as nodes. Editing a parameter re-evaluates in a worker: SMLib makes the solid, it converts to `BrepForm`, and `tessellateBrep` draws it until step 5's GPU path exists.
- **Picks to the tree:** a picked face highlights the node that made it, from the kernel's record of which input each output face came from: the stable topology names above, in practice.
- **Editing as §13.33 describes it:** drag previews as transient geometry, updates face by face, and queries that skip what is being dragged.
- **A four-view layout (owner, 2026-11-10):** CAD's quad view in third-angle projection, Top above Front, Right beside Front, and an isometric perspective in the fourth corner. Four views in one canvas by viewports; the three projected views linked (one target and zoom, and a pan moving the matching axis in the others) while the perspective orbits on its own; a pick in any view highlights the same face and tree node in all four. It exercises an application's comparison views (§13.34) on the engine's linked views and viewports, and 5d's orthographic camera; until 5d lands, the projected views use a very long lens or the layout waits.
- **First, a spike:** box minus cylinder in each kernel in WebAssembly, converted to `BrepForm` and drawn in the first-look example. It measures each boolean's time and checks that both results validate, and for OCCT records the build's size (a full build is tens of megabytes; a custom one with modeling and STEP only is smaller), whether it needs threads and so cross-origin isolation, and how actively its WebAssembly build is maintained. Its conversion (SMLib's b-rep to `BrepForm`) is the one `fromUsd` needs too, so step 8's start moves here, with SMLib's pinned setup step and build script (above).
- **Open:** both kernels' robustness on real models (their first measures are in "CSG spike, SMLib's half" and "OCCT's half" below, and both answer face provenance); the worker protocol for a re-evaluated solid; OCCT's licence (LGPL 2.1 with Open CASCADE's exception, unlike SMLib's Apache 2.0): kept as a separate, lazily loaded WebAssembly module in the example only, and checked before anything built with it is distributed. If OCCT proves too heavy, or its licence doesn't fit, the sample runs on SMLib alone and the interface costs nothing extra.

**Also (§13.34):** step 3's queries respect clipping and read scalar fields, step 5 draws section caps on B-reps, and step 7's exact picks work through a cut.

**Sequencing with the vector design (owner, 2026-11-09).** B-reps go first, but the kernels they share with vectors are set by vectors, their harder user: per-pixel coverage under glyph and label density with the band cap under pressure, strokes with the styling language's full control, and the owner's measured prototype as evidence. A trim loop is a small glyph in (u, v). So:

1. B-rep work that doesn't touch the shared kernels starts first: both spikes, the query interface, the render form, GPU patch tessellation through placement, and exact picks, snapping and measurement. Spike B's trim coverage test is throwaway.
2. The vector design session sets the shared curve, coverage and stroke contracts, with b-rep trims and edges as stated requirements.
3. B-rep trims and edges move onto those kernels.
4. Vectors build the rest: styling, labels, the columnar store that replaces Entity (§13.29), and draping.

The extensions here are drafts for this proof of concept and free to change, so a format chosen early is no constraint.

**Spike A result (2026-11-09).** SMLib and its C API layer build to WebAssembly with Emscripten and run under Node, with no source edits. Measured at `-O3`:

- Size: 1.11 MiB brotli for the whole kernel (1.63 MB gzip, 5.1 MB raw), plus 19 KB gzip of glue. A trimmed export list, `-Oz` and LTO are not yet tried.
- Instantiate: about 11 ms. Warm tessellation of analytic solids: a box in 3 ms, a cylinder in 7.5 ms, a sphere (224 triangles) in 11 ms.
- Needs: exceptions (`-fexceptions`); a stack of at least 4 MB, since the default 64 KB corrupts the heap (the real need isn't measured); memory growth.
- Doesn't need: threads or SharedArrayBuffer, so no cross-origin isolation; a filesystem; OpenUSD, Boost or Python. The only outside dependency, TBB, becomes a short serial stand-in, so tessellation runs on one thread per worker.
- USD input: the existing reader links OpenUSD. Building OpenUSD to WebAssembly is judged large and risky (inferred, not tried). Cheaper paths: a small reader of the BRep attributes that builds SMLib b-reps through its API, or an offline conversion to SMLib's native format.

The conversion half of the spike remains: one real trimmed NURBS solid (an SMLib native file or one built by hand), with positions, normals and indices extracted to typed arrays, timed against native, and the size options tried.

**SMLib's build, in the repository (2026-11-10).** Nothing in the engine's core uses SMLib: steps 3, 4 and 4b are TypeScript. The spike's build files had been kept outside the repository, on another machine, so they were recreated on Windows. They're committed now, and `npm run setup` builds SMLib on every machine. Setup fetches NVIDIA-Omniverse/usd-brep at commit `3fd5b9548d19aa8c12c29bc9637a96d42a06f8a5` (2026-10-22; only SMLib and SM_API, sparse) and emsdk 7.0.0 into the setup store, as it does the Slang toolchain, and builds `smlib.mjs` and `smlib.wasm` there, outside version control. A clean build takes about 2.5 minutes, and a change to the bindings relinks in about half a minute. The dev server serves the build at `/smlib/`. What is committed (`packages/next/scripts/smlibTools.mjs`, `scripts/smlib/`):

- `bindings.cpp`, the C layer JavaScript calls over SM_API's C++. It covers primitives, translation, booleans, validity, volume, face tags, the export to the render form (below), and SMLib's own tessellation;
- the build: each library compiled with its own include order (SMLib and SM_API both have a `StdAfx.h`), with no source edits.

Nothing stands in for TBB. SMLib's TBB code (parallel UV trim curves and tessellation, and the scalable allocator) compiles only with `SM_USE_TBB` and `SM_USE_TBB_SCALABLE`, which usd-brep's own build doesn't define either. So the kernel is serial as shipped, and Spike A's serial stand-in was never included. A clean build without it proves this.

`node scripts/smlibTools.mjs --check` loads the build in Node and repeats Spike A's measures:

- Size and startup: 1.05 MiB brotli (4.6 MiB raw) and 6 KB gzip of glue. The glue is smaller than the spike's with no filesystem and an ES module. Instantiation takes about 14 ms.
- Warm tessellation: a box in 0.9 ms, a cylinder in 5.5 ms, and a sphere (224 triangles) in 5 ms. That's about twice as fast as Spike A, measured on a different machine.
- The CSG spike's first boolean: box minus cylinder in about 21 ms (one run, cold). The result is a manifold solid of 7 faces, with its volume matching the exact one to 6 decimals.

**CSG spike, SMLib's half (2026-11-10).** SMLib's b-rep converts to `BrepForm` exactly, and the first-look example draws three booleans made live in the browser. The conversion is also `fromUsd`'s, so step 8 has started.

- **The export.** `smlib_brep_export` walks SMLib's `SmBrepData` (its own flat b-rep: faces, loops, edge-use pairs, edges and vertices as index blocks) and writes one record of doubles. Every surface and curve is the NURBS SMLib holds. A face's outward side comes from its faceuse that bounds a void region, and edges and vertices carry SMLib's tolerances (1e-5 m here). UV trim curves are made where missing, per edge use, since `CreateUVTrimCurvesParallel` exists only with TBB.
- **The reader** (`src/brep/smlib.ts`, outside the public entry). `readSmlibExport` builds the form with `BrepBuilder`. Edges are trimmed to their interval of the curve exactly (`trimNurbsCurve`, new in `nurbs.ts`), and a use against its edge gets its pcurve reversed (`reverseNurbsCurve`). Each loop is turned to the form's winding by its signed area in (u, v), and a sphere's poles become zero-length edges. `SmlibKernel` wraps the module: primitives, translation, booleans, tags, validity, volume and `toForm`.
- **Checked** (`test/data/brepSmlib.test.ts`, in `npm run test:data`): a box, cylinder, sphere, torus and cone frustum, box minus cylinder, and box with sphere united and intersected. Each form validates with no problems. On every face, over 95% of its triangles have the solid's outside off the face's normal and the inside behind it, checked against the exact solid. With every face flipped, that share is 0.
- **Face provenance: yes, for SMLib.** An application attribute (`SmLongAttribute`, id above 10,000, copy behaviour) on each input's faces is copied by SMLib to the faces a boolean makes from them. Box minus cylinder gives six faces tagged as the box, including the top and bottom with the hole as an inner loop, and one tagged as the cylinder. In the example, a picked face says which input it came from. This is the CSG sample's picks-to-the-tree, without SMLib's stable topology names.
- **Timings.** Warm, in Node: box minus cylinder in about 5 ms, and the conversion in about 1 ms. Cold, in Chrome on the main thread: loading the module takes 68 ms, the three booleans 7 to 57 ms, and their conversions 3 to 10 ms.
- **Found: analytic kinds are lost.** SMLib's analytic surfaces are B-splines whose NURBS parameterization isn't the form's analytic one: an angle, for example, maps to a rational function of the NURBS parameter. Trim curves live in the NURBS parameterization, so every face converts as Bézier patches. That's exact, but "Colour by surface kind" shows only Bézier. The CPU tessellator's Bézier error bound is also looser than its analytic one: an SMLib sphere costs 53 ms and 24k triangles at 1 mm, where the analytic fixture costs 7.5 ms and 6k triangles, and its bound reaches 2.1 mm before the grid cap. Planes could keep their kind, because their map is affine. Quadrics would need their trim curves refit in the analytic parameterization, which is no longer exact. Step 5's GPU path measures error per view, so this is about cost there, not accuracy. The brainstorm below takes it further.
- **Not done yet (SMLib's half):** the kernel interface the sample switches behind; running the kernel in a worker; the four views.

**CSG spike, OCCT's half (2026-11-10).** Open CASCADE converts too, and its faces stay analytic. The first-look example's second scene, "Two kernels", draws each boolean from both kernels side by side in one render form.

- **The build.** `replicad-opencascadejs` 1.2.1, replicad's custom OpenCascade.js build, is actively released (1.0 in August 2026, 1.2.1 on 2026-11-06). OpenCascade.js's own 2.0 betas last published in March 2023. The single-threaded build is 22.9 MB raw and 4.8 MB brotli, against SMLib's 1.06 MiB, and needs no threads, so no cross-origin isolation. It is LGPL 2.1. `npm run setup` fetches it into the store, pinned and checked against npm's integrity hash (`scripts/occtTools.mjs`), and the dev server serves it at `/occt/`. It is never bundled. It includes STEP import, which is untested here.
- **Analytic all the way through.** OCCT's plane, cylinder, sphere and torus use the form's own parameterizations, and its cone differs only in measuring v along the slant (v' = v·cos a). So faces convert to the form's analytic kinds, with pcurves unchanged or mapped affinely. `occtToForm` reads each frame off OCCT's evaluator, checks it against the form's formula at three points, and turns y and u around for a left-handed frame. Box minus cylinder gives 6 planes and 1 cylinder, and a picked point's (u, v) is a real angle. This answers the brainstorm's question: only SMLib needs identities.
- **Face provenance: yes, for OCCT,** from each boolean's history (`Modified`, `IsDeleted`). Both kernels now answer which input a face came from.
- **Gaps in the build's bindings, worked around:**
  - OCCT's indexed shape map can't be constructed and shapes expose no hash, so finding a sub-shape is a linear `IsSame` scan. That's quadratic: fine for samples, not for big imports.
  - `BRep_Tool.CurveOnSurface`'s face overload fails, so pcurves come through `BRepAdaptor_Curve2d`.
  - `Oriented()` returns an untyped shape, which must be cast back.
  - There's no 3D curve approximation.
  - Wires aren't explored in loop order, and vertices can't order them on a cylinder's side (seam and circles share both vertices), so uses chain by their ends in (u, v).
- **The first representation error.** OCCT makes plane-sphere intersections B-splines of degree 8, not circles. Curves above the form's degree 3 become piecewise cubic Hermite curves within half the edge's tolerance (`approximateCubic`, kernel-neutral, in `nurbs.ts`). A pcurve's error is measured through the surface in metres, and the error made is added to the edge's tolerance. Box and sphere intersected stays under 1e-5 m. This is the brainstorm's representation error, stated where the validator and queries read it, before the form has a field of its own for it.
- **The validator is exact on curved edges now.** OCCT's tolerances (1e-7 m) are below the chord error of the 64-sample edge polyline the validator used (about 4e-5 m on a 0.5 m circle). It now refines the nearest polyline point by Newton on the exact curve segment. SMLib had passed only because its pcurves share their edge's parameterization, so the sample points coincide. This replaces "curved edges need about 1 mm of tolerance" in step 4's draft below.
- **Timings.** Warm, in Node: box minus cylinder in about 4–5 ms, the same as SMLib. Conversion takes 4–6 ms against SMLib's 1 ms, since every read crosses embind, where SMLib writes one flat record. Instantiation takes 190 ms. Cold, in Chrome: loading takes 250–310 ms, the booleans 18–89 ms, and the conversions 4–131 ms (the most for approximating the intersection's curves). On the CPU tessellator, OCCT's analytic sphere costs 11 ms at exactly the 1 mm asked, where SMLib's NURBS sphere costs 53 ms with its bound at 2.1 mm.
- **The example, reworked as it grew crowded.** It has two scenes behind a switch: the gallery of nine hand-built shapes, and the two kernels side by side, which load only when that scene is first shown. The panel shows display settings in a compact grid, the tessellation's numbers folded to one line, and a shapes table. For the kernels it's a comparison table of operation by kernel: boolean and conversion time, faces by surface kind, and validity. "Colour by kind" shows the split at a glance: SMLib's solids all Bézier, OCCT's planes, a cylinder and spheres. The scene's runner (`examples/brep-first-look/kernels.ts`) is a first draft of the sample's kernel switch: the same recipes over primitives both kernels make, and the same tags.
- **Not done yet:**
  - the kernel interface proper, beyond the example's runner;
  - workers;
  - freeing OCCT's embind objects, since the converter leaks the handles it reads;
  - STEP import;
  - the four views.

**Brainstorm: modeling geometry and render geometry (owner, 2026-11-10).** Not decided; a session to think through. It was prompted by the finding above: the same exact cylinder costs several times more to draw once it arrives as a NURBS. The suspicion is that the form joins two things that could be kept apart. One is what the model _is_: the kernel's geometry, its parameterization, its tolerances and its names. The other is what gets _drawn_: whatever the GPU evaluates fastest within a visual tolerance.

- **Two kinds of geometry, kept apart:**
  - _Modeling geometry_ is the source's: SMLib's B-splines, OCCT's analytic surfaces, a USD BRep. It has the kernel's parameterization and tolerances (SMLib's 1e-5 m), stable topology names and history. Measurement and snapping answer against it, or against an exact copy of it.
  - _Render geometry_ is chosen for the GPU: rational Bézier patches, analytic kinds where cheaper, and planar faces as fills. Its one duty is to lie within the visual tolerance of the modeling surface, and to meet its neighbours on shared edges.
  - The two needn't share a parameterization. Today they must, for one reason: pcurves and picks live in the surface's (u, v). The pick fragment writes (face, u, v), and the CPU evaluates the exact surface there. Whatever separates them must keep that path exact, or state the error it adds.
- **Three tolerances, never mixed:**
  - _Model tolerance:_ how exact the source claims to be, such as edge and vertex gaps (`edgeTolerance`, `vertexTolerance`).
  - _Representation error:_ how far the form's surface is from the source's. NURBS split into Bézier patches has none. An approximated curve or surface, such as SMLib's `ApproximateCurve` for intersection curves (the export's `approximationGap`), offsets and sweeps, or a refit, carries its error. The form has no per-surface field for it yet.
  - _Display tolerance:_ pixels, per view, and never reported as accuracy.
  - The rule: a measured answer states model tolerance plus representation error. A display tolerance enters an answer only when the answer comes from a mesh, and then the answer is provisional and says so, as staged server answers already do. Step 3's open question (`GeometryAccuracy` as one number, or composed with `AccuracyTerm`s) gets its terms from this list.
- **Getting the analytic kinds back, ranked:**
  1. _Keep the NURBS parameterization, and add the surface's analytic identity beside it:_ its kind, frame and radii, which SMLib reports for free (`IsKindOf(SmCylinder_TYPE)`, `SmAxis2Placement`), as does OCCT. Pcurves and picks don't change. Closest points and ray hits use the closed form in 3D, which needs no (u, v). The tessellator bounds error from the known curvature (a sagitta, `r(1 − cos θ/2)`) instead of the Bézier net. "Colour by surface kind" works again. This is the separation in its smallest form: identity for queries and error bounds, parameterization for drawing and picks.
  2. _Planes only:_ map NURBS (u, v) to the plane's affinely, and transform pcurves exactly. Cheap, but it covers less than option 1, which planes also get.
  3. _Refit pcurves in the analytic parameterization:_ no longer exact, so it needs a stated representation error. Last resort.
  - On the GPU, a rational biquadratic patch costs about as much to evaluate as `cos`/`sin`. The 7× cost measured on the CPU is probably a loose error bound making extra triangles more than evaluation (to be measured, below). So option 1 may recover the cost without the analytic evaluator. This is also the plan's open item "an error bound that is safe for rational surfaces". Spike B's net bound had almost no margin with a weight of 2, and is loose for circles.
- **API implications:**
  - _The form:_ `surfaceKind` splits into how to evaluate (analytic or Bézier) and what it is (an identity of kind, frame and params, possibly "none"). Each surface gains a representation error. `BENTLEY_brep` gains both as optional arrays, with the fallback mesh unchanged.
  - _`BrepBuilder`:_ `nurbsSurface(surface, { identity, error })`, so a kernel-neutral host passes what it knows. SMLib's and OCCT's converters fill both.
  - _Queries:_ every answer names what it ran against (source, form, or mesh) and its accuracy terms. `display(tolerance)` stays a separate query, since a mesh is never the measurement.
  - _Tessellation options:_ the CPU path takes metres in the source's units, and the GPU path takes pixels per view, with placement error added under reprojection (above). Both report the error they achieved, not only the target.
  - _The kernel interface (CSG sample):_ kernel to form, plus identity and representation error per surface, plus face provenance (tags, history). The engine never asks the kernel to draw.
- **Bypassing the CPU tessellator.** What it does today:
  - It draws everything until step 5.
  - It writes the glTF fallback mesh.
  - It feeds the mesh adapter that picks and rays use.
  - It feeds the example's overlays: selection, iso lines and whiskers.
  - It's the self-check in tests.

  Step 5 can take over most of this:
  - _Drawing:_ compute evaluates patches per view from the form and draws them indirect, so no CPU mesh exists to draw. In the CSG edit loop, the CPU tessellation (13–53 ms per solid here) drops out of the latency. What's left is the kernel (about 5 ms), the conversion (about 1 ms), the upload and one frame.
  - _Picks:_ already exact without a mesh (face ID and (u, v) from the pick fragment, then float64 evaluation).
  - _Rays and closest points away from the screen:_ a hierarchy over patch bounds (the control net's convex hull contains its patch exactly), then subdivision and Newton. No tessellation, and the answers are exact, not mesh-accurate.
  - _Areas, volumes and lengths:_ quadrature on patches, or the kernel, never a sum over triangles.
  - _What stays on the CPU:_ the fallback mesh, written offline by the tiler, not at runtime; a coarse proxy for culling, which the control nets give; and the reference, which is SMLib's (step 4b).
  - _The catch is trims:_ per-pixel trims wait for the shared coverage kernel (the vector-design sequencing above). An interim split: the GPU path for untrimmed faces, faces with rectangular trims and planar faces (fills), and the CPU only for trimmed curved faces until the kernel lands. Building trim curve bands on the CPU is cheap next to tessellating.

- **Where it sits: all of it below `GeometryQueries` (owner, 2026-11-10).** Step 3's query interface is the boundary. Picks, snapping, measurement and the scene layer (`SpatialQueries`) see one interface per object and never the split behind it.
  - _A b-rep adapter_ (`brepGeometry`, beside `meshGeometry` and `sdfGeometry`) holds the modeling side: the form with its surface identities, and optionally a kernel or a server route. It chooses how to answer each query: a closed form from the identity, subdivision and Newton on the Bézier patches, a kernel call, or a provisional answer from a mesh. Callers don't choose.
  - _`GeometryAccuracy` becomes the composed terms:_ model tolerance, representation error, and a display tolerance only when the answer came from a mesh. It also names the route it took (source, form, mesh, or server). Today's `{ meters, exact, note }` is the sum and a flag. The mesh adapter is the degenerate case: its source, form and mesh are the same, so its terms collapse to what it reports now. This answers step 3's question 4 (one number, or composed terms).
  - _The render side's door is `display(tolerance)`_, and only for the CPU path. The GPU path reads the form directly and never goes through the query interface. That answers step 3's question 5: display belongs to the render form, and the query interface keeps it only as a convenience for mesh-only consumers (fallbacks, exports, tests).
  - _GPU picks come back in through the adapter:_ the pick fragment's (face, u, v) is refined by the adapter, as an entry beside `closestPoint`, to an exact point with its accuracy terms. The render parameterization stays an adapter detail. If identity and parameterization ever diverge, as with refit pcurves (option 3), the adapter owns the map and adds its error.
  - _Server answers_ stay at the scene layer (step 3's question 1). A server is one more route, whose accuracy carries the same terms and which upgrades a provisional answer when it arrives.
  - What this asks of step 3's code: an adapter for b-reps, accuracy as terms with a route, and a refine-a-pick entry. Nothing above the interface changes.
- **An example of geometry as one thing (owner, 2026-11-10).** Because exact geometry lives behind one query interface, the engine can answer questions that cross representations and reference frames, which a traditional CAD tool can't. The example: the shortest distance between a 3D Tiles reality mesh (as-built, in its tileset's frame) and an edge of a design b-rep (as-designed, placed from a projected or engineering frame through §13.26). Each side states its accuracy terms: the mesh its tile's geometric error at the loaded level; the b-rep its model tolerance plus representation error; the frames the accuracy of the transform between them (the frames layer's terms). The answer composes them.
  - It shows the interface's point: picks, snaps and measurements don't care what a geometry is made of or which frame it was authored in. They name a frame and an instant, and each answer says how sure it is.
  - Use cases: clearance between a designed bridge or pipe and scanned ground or structure, clashes between design and as-built, and checking a design against survey.
  - What it needs: the b-rep adapter (above); the tileset mesh adapter reporting each tile's geometric error as an accuracy term; a distance-between-two-geometries query (closest pair, an entity on each side) beside `segmentDistance`; and the frames layer's transform accuracy feeding `GeometryAccuracy`. A later example, once step 3's b-rep adapter exists.
- **To find out first:**
  - On the GPU, the cost of a rational patch with a curvature bound from its identity, against the analytic evaluator, on the SMLib sphere and cylinder: is option 1 enough?
  - How much of the CPU tessellator's cost on SMLib's solids is the bound, measured by giving it the curvature bound.
  - Answered by OCCT's half (above): its analytic surfaces match the form's up to an affine map (only the cone's v scales), so it writes analytic faces directly and only SMLib needs identities. The two kernels in the first-look example show the split from both sides.
  - Where a representation error comes from for kernels that approximate, and whether they report it, as SMLib's `ApproximateCurve` does.
- **Candidate next steps, small first:**
  1. Surface identity and representation error in the form, the builder and the SMLib export. **Done 2026-11-10.**
     - `BrepForm` gains `surfaceIdentity` and `surfaceError`. A Bézier surface with an identity keeps that identity's frame and params in `surfaceFrame` and `surfaceParams`.
     - `BrepBuilder.nurbsSurface(surface, { identity, error })`.
     - `BENTLEY_brep` carries both as optional arrays.
     - SMLib's export (layout version 2) names planes, cylinders, cones, spheres and tori from `GetCanonical` and `GetPosition`. A cylinder is a cone in SMLib.
     - The validator checks both arrays.
     - The example colours faces by identity and says "held as Bézier patches".
  2. A curvature-aware bound in `tessellateBrep` for surfaces with an identity, and a weight-aware net bound for the rest. **Done 2026-11-10.**
     - `brep/bounds.ts` bounds a rational patch's speed and its angular rate about the identity's axis. The bounds come from Bernstein coefficients over 2 × 2 sub-patches, so they hold for any positive weights.
     - A cylinder's ruling needs one cell.
     - Tests sample every triangle densely against the true surface.
     - SMLib's sphere (r 1.5 m) at 1 mm: 15.5k triangles in 44 ms, within 1 mm. Before: 24k triangles in 53 ms, capped at 2.1 mm.
     - Box minus cylinder: 7.5k triangles in 18 ms.
     - Implemented by a Sonnet 5.5 agent from a brief.
  3. A slice of step 5: untrimmed and planar faces on the GPU, with the CSG sample's edit loop as the measure.

**Step 5 redirected: one GPU path for every face (owner, 2026-11-10).** The owner asked whether the GPU could handle every input, with no CPU fallback. It can, by a published method, and step 5 is built that way instead of the interim split above. The "STEP file" scene shows why: CTC-05's 208 faces take the CPU tessellator 768 ms and 373k triangles at 1 mm, and its planar faces show a sawtooth wherever the cell-discarding trim meets a curve.

- **Direct trimming:**
  - Each face is diced per view on the GPU over the bounding rectangle of its trim loops in (u, v). Analytic surfaces use their formulas; Bézier spans use de Casteljau in homogeneous coordinates.
  - The fragment stage discards outside the trim region by an exact test on the face's pcurves: a winding number, with the curves sorted into bands in v, as Slug does for glyphs (Lengyel, 2017). That is the shared coverage kernel the vector design reserves, built here first.
  - Prior art: Guthe et al. (2005) for GPU trimming and tessellation of NURBS; Schollmeyer and Fröhlich, "Direct Trimming of NURBS Surfaces on the GPU" (2009), and their anti-aliased trimming of large NURBS models (2019).
- **Fast paths:** a face whose trim is its rectangle skips the test, and so do grid cells classified as fully inside. Their fragments keep early depth.
- **Seams:** neighbouring faces trim along their own pcurve images of the same edge, so they meet within the edge's tolerance plus the tessellation error. A dilation of about half a pixel outward in (u, v) closes pinholes, and the edge lines draw over the seam. Stitching to shared edge samples isn't needed for drawing.
- **The varying budget:** a patch draw's UV varying carries the face's (u, v), offset to the rectangle's corner so float32 holds it. No varying is added. Depth, shadow and pick passes need the same discard, so patch draws get a fragment stage there.
- **Picks:** each fragment knows its face and (u, v), so a pick is a domain point (§13.26's brainstorm) and the exact point is a float64 evaluation.
- **What the CPU tessellator keeps:** the offline glTF fallback mesh, the mesh adapter for queries until the b-rep adapter exists, and the reference in tests. Nothing it does is in the drawing path.
- **Part 1 is done (2026-11-10, a Sonnet 5.5 agent from a brief).**
  - `brep/gpuPatches.ts` writes a 48-word record per (face, span) for every face. Each holds:
    - its kind, analytic frame or control net, and face rectangle in (u, v);
    - its spheres;
    - the face's per-unit densities;
    - error constants C_u, C_uv and C_v from a sagitta, an identity, or sound Bernstein bounds;
    - a trim word.
  - Records and nets live in the vertex arena.
  - `dicePatches` runs after the cull. It takes a thread per span, sizes the grid from pixels per metre at the face's nearest point (perspective and orthographic), appends chunks of up to 8×8 cells, and writes one non-indexed indirect draw per patch draw.
  - `vsPatch` evaluates the surface (analytic formulas, or de Casteljau in homogeneous coordinates) and its exact normal. It goes through the same `vertexOut`, so placement and the Jacobian normal apply. The UV varying carries (u, v) relative to the rectangle's corner.
  - There are 10 pipeline keys: opaque, depth, shadow, height and prepass, each one- and double-sided.
  - `World.addBrep` is provisional. Faces whose trim is their rectangle go to the GPU, and the rest stay on a CPU mesh until part 2.
  - `spikes/brepPatches.html` passes on an NVIDIA Lovelace GPU:
    - The analytic cylinder, the sphere span and a weighted rational patch are within 0.32 px of the surface (target 0.5 px), at 20 m and 5.5 m.
    - The cell counts match the CPU twin.
    - There are no cracks between spans.
    - A warped patch matches the twin.
    - Shadows, AO and picks work.
- **Part 1's cost (200 faces, 550 spans):** dicing on the GPU costs 0.026 ms. The main pass costs 0.78 ms for 10,300 triangles, against 0.12 ms for `tessellateBrep`'s 7,700. Two causes, for a performance pass after part 2:
  - 211,200 vertex invocations for 5,150 cells. Spans average about 9 cells, so 8×8 chunks are mostly degenerate, and each grid point is evaluated six times. Indexed chunks with shared vertices, and chunks sized to the spans, fix both.
  - Preparing spans on the CPU (34 ms) costs more than tessellating (19 ms), mostly in the Bernstein bounds. That matters for the CSG edit loop.
- **Part 2 is built (2026-11-11, from a brief; not yet run on a GPU).** Every face draws on the GPU; `World.addBrep` has no CPU mesh in the drawing path (`cpuFaces: "trimmed"` restores the old split, as a diagnostic).
  - _Trim data_ (`brep/gpuTrims.ts`, in the face's arena range after the control points): each loop's pcurves, closed by straight pieces where uses don't meet, are cut at their extrema in v and fitted by monotone non-rational quadratics within the least of the edges' tolerances and 1e-5 of the face's size, over hypot(speed_u, speed_v) in (u, v) (not below 2e-7 of the rect's side). Up to 64 bands of v, each listing its pieces by reach in u.
  - _The kernel_ (`shaders/coverage.slang`, shared with the vector fills later): the winding number of a ray along +u with the half-open endpoint rule, one quadratic solved in closed form per piece. Dilation: half a pixel (`fwidth(uv) / 2`) along u from the nearest crossing, and along v from the winding at (u, v ± half a pixel): a plus-shaped dilation that keeps what is within 0.7 of a half pixel of the boundary and nothing beyond 1.4 of it, which closes seam pinholes.
  - _Pipelines_: a solid is two patch draws, complete faces (early depth) and trimmed faces (`...PatchTrimmed` keys for the opaque, depth, shadow, height and prepass passes, whose fragment entries test and discard). Picks read the feature target and the depth the discards leave unwritten.
  - `spikes/brepTrims.html` (`runBrepTrims()`) checks the classification per pixel against the CPU's, closed solids for pinholes, shadows, AO and picks, and the times against `tessellateBrep`.
  - **On an NVIDIA Lovelace GPU (2026-11-11):** every face draws on the GPU.
    - The gallery draws 39 of 39 faces on the GPU. The plate's bolt holes, the filleted block's hole and the trimmed NURBS face are cut per pixel with clean edges, where the CPU path showed a sawtooth.
    - CTC-05 draws 208 of 208.
    - Not good enough yet, for the performance and correctness pass next:
      - The gallery's frame costs 10–12 ms of GPU time and 33–50 ms of CPU time. The CPU path costs about 1 ms of each.
      - Preparing CTC-05 (spans and trims) takes 1.5 s.
      - The trim tolerance of 1e-6 m gives about 66 pieces per round hole. Drawing needs only the display tolerance, since picks are refined exactly.
      - `runBrepTrims()` runs through the classification checks and the built and OCCT closed solids, then stalls at CTC-05's stage without an error.
      - One screenshot showed black box faces in GPU mode, unconfirmed.

**The handbook's deep dives (owner, 2026-11-10).** As this work lands, the handbook gains four deep dives. Each is written when its subject is built, and kept to what is built:

1. **Warps and routes:** true coordinates and the drawn map, warps as frame-graph edges, routes, per-tile lattice fits and their error, weighted terms, Jacobian normals, drawn bounds and LOD, parameter ranges, and the varying swap. Increments 1 to 3 are built, so it can be written now.
2. **Clipping:** clips as world objects in any frame, how each is evaluated, shapes and combining, exact b-rep caps and geometric mesh caps, styling, and clips in queries. After increment 8.
3. **The tessellation pipeline:** the CPU tessellator and its sound bounds, GPU dicing per view, direct trimming, seams, error in pixels, and what each path is for. After step 5.
4. **B-reps and the geometry interface:**
   - `GeometryQueries` as the one interface over meshes, SDFs and b-reps, with domain points and fields, and accuracy as terms.
   - Modeling geometry against display geometry: surface identity, representation error, and the three tolerances.
   - The relationship to CAD kernels (SMLib, OCCT, STEP): the engine never asks a kernel to draw.
   - Written in parts as step 3's b-rep adapter and step 5 land.

**Spike B result (2026-11-09).** One rational bicubic NURBS face (100 m square, 3x3 Bézier spans, one control point of weight 2) with a circular hole in (u, v), drawn in Chrome on an Apple GPU. The vertex shader evaluates an n x n grid per span. The pixel shader computes the exact normal and cuts the hole by signed distance in (u, v). n is chosen per view from the bound 0.75·D/n² on the second differences of the Bézier net, converted to pixels, with a target of 0.5 px. Measured:

| Distance | n   | Triangles | Bound   | Measured error | GPU time |
| -------- | --- | --------- | ------- | -------------- | -------- |
| 150 m    | 9   | 1,458     | 0.41 px | 0.40 px        | 0.18 ms  |
| 600 m    | 4   | 288       | 0.48 px | 0.38 px        | 0.03 ms  |
| 3000 m   | 2   | 72        | 0.38 px | 0.23 px        | 0.01 ms  |

- The bound was never exceeded, and over-tessellates by at most about 1.6x in pixels. With almost no margin at 150 m, a stronger weight could exceed it: the engine needs a bound that accounts for weights, or a safety factor.
- Cutting the hole per pixel cost nothing measurable, but a circle is one distance test. General trim curves need a lookup per pixel and wait for the shared coverage kernel. Its effect on MSAA, a depth-only pass, shadows and picking (each needs the same test) was reasoned about, not run.
- SMLib, at the same tolerance from 600 m: 209 triangles, 0.498 px, 9.6 ms to tessellate, and about 270 ms more to build and trim the face (WebAssembly, one thread, Node). Both meshes lie within the target of the true surface; the distance between the two meshes wasn't measured. This supports tessellating on the GPU, with SMLib for conversion and reference.
- Not covered: 32-bit evaluation in a globe position (the engine must evaluate relative to a nearby origin, as it does elsewhere); cracks between spans; compute-driven tessellation, which one face can't judge and step 5 measures with many patches.

**Step 3 draft (2026-11-09, plan `docs/superpowers/plans/2026-11-09-brep-3-geometry-queries.md`).** `GeometryQueries` in `src/geometry`: one interface per object, synchronous, in float64 and in the object's placed coordinates, with an optional `origin` that keeps the arithmetic precise at Earth-fixed scale. Queries: bounds, ray hits (hit, miss or unknown), closest point (on a face, edge or vertex), segment distance, topology and display at a tolerance. Every answer carries its accuracy. Two adapters: `meshGeometry` (triangles as stored, placed in float64) and `sdfGeometry`, the f-rep slot (sphere tracing with a step cap). Tileset rays (`castTilesetRays`) and the client snap's occlusion test run on the mesh adapter, with unchanged results. The scene layer (`SpatialQueries`) keeps frames, instants, batching, asynchronous answers and revisions.

**Questions for the API review:**

1. Two layers: a synchronous object layer under the asynchronous scene layer. Should a server's staged answers arrive as a scene-layer backend, as drafted, or should the object layer be asynchronous?
2. Frames and instants live at the scene layer, and object answers are in placed coordinates. Should each object state its frame and instant?
3. `EntityRef` is a number plus an optional feature ID, and mesh edges are half-edges (`triangle * 3 + side`). Stable source IDs need strings or a source table.
4. `GeometryAccuracy` is one number in metres. Should it compose with the measure module's `AccuracyTerm`s, and is it a bound or 1σ?
5. Is `display(tolerance)` a query, or does it belong to the render form (steps 4 and 5)?
6. `segmentDistance` exists for the "missed by less than its error" verdict. Keep it, or replace it with a ray answer that carries the near miss?
7. The client snap's search of the screen aperture isn't moved yet (it still uses its own triangle test): it needs a cone or screen-space query.
8. There is no acceleration structure: queries are linear in triangles, as before.

**Step 4 draft (2026-11-10, plan `docs/superpowers/plans/2026-11-10-brep-4-render-form.md`).** `src/brep`: the render form as typed arrays (surfaces analytic or rational Bézier patches; faces, loops, uses, edges and vertices; pcurves and 3D curves as exact rational Bézier of degree ≤ 3; tolerances; one string table of stable IDs; a content version), exact float64 evaluation, the exact NURBS split by knot insertion (agreeing with de Boor within 1e-9 m), `BrepBuilder` for hosts and `validateBrep`, which never throws. The draft glTF extension `BENTLEY_brep` (`src/brep/BENTLEY_brep.md`) holds the arrays in raw bufferViews (glTF accessors have no float64) beside a primitive's fallback triangles, and is never required; `parseGltf` reads it, drops a malformed b-rep with a warning, and composites carry it. Nothing draws it yet. The validator checks pcurve images against a polyline of the edge, so curved edges need about 1 mm of tolerance; make it exact with step 7's closest points. (2026-11-10: done for the validator, which now refines by Newton on the exact curve; see "CSG spike, OCCT's half".)

**Questions for the API review (step 4):**

1. Bézier patches are stored in place of NURBS: size against loader work.
2. Pcurves and edges are exact rational Bézier of degree ≤ 3, and quadratic segments are made later, by the renderer.
3. One `ids` string table, faces then edges then vertices.
4. Float64 throughout the file.
5. The `BENTLEY_` prefix, and the name.

**Open:** the extension's name, and review of its schema; whether tiles store NURBS or pre-split Bézier patches (size against loader work); how b-rep edges meet the vector design's exact circles and clothoids; SMLib on real trimmed models (speed, correctness, memory); the USD input path; an error bound that is safe for rational surfaces; crack-free edges between patches of different density.

### 13.34 Capabilities the infrastructure and geoscience domains need (owner, 2026-11-10)

**Recorded to plan around, not designed.** A review of what the engine needs to serve as the rendering core for engineering, construction, reality capture, analysis, geoscience and operations work, beyond what is built or planned above. Each capability below recurs across several domains. The table after it says which upcoming steps should leave room for each, so later work doesn't have to undo earlier choices.

**Domains, and what each adds beyond the plan:**

- **Geoscience and the subsurface:** implicit geological surfaces (the f-rep slot in §13.33), block models (sub-blocked voxel grids with attributes, very large), drillholes as tubes coloured by interval, geophysical grids, volume rendering and isosurfaces, vertical exaggeration, and seeing and moving below the terrain.
- **Reality capture:** billion-point clouds with classification colours and eye-dome lighting, Gaussian splats, 360° and oriented imagery projected onto models, mobile-mapping trajectories, and comparing captures from two dates.
- **Infrastructure design:** CAD display (§13.27), exact B-reps (§13.33), alignments and corridors (built), cut and fill against existing ground, plan and profile views, federated models of millions of elements, and isolating, hiding and emphasising elements.
- **Construction scheduling (4D):** each element's visibility and appearance over time, animated equipment, progress colouring and clash display.
- **Structural and geotechnical analysis:** results on meshes (deformed shapes at a scale, scalar contours with colour ramps and legends, vector glyphs, diagrams along members, animated mode shapes) and line members extruded by their cross-section.
- **Water and flood:** time-varying water surfaces and depth rasters over terrain, flow arrows and particles, and pipe networks with attributes.
- **Power lines:** wire catenaries as exact curves, clearance envelopes, classified lidar and vegetation encroachment.
- **Operations:** live sensor data, labels and billboards carrying data, heat maps, time-series playback, GIS feature services and vector tiles, and building floors.
- **Detections and simulation:** many geolocated detections linked to their source images, and thousands of moving agents with density maps (the live-points path, §13.11).

**Capabilities that recur, and are not yet planned:**

1. **Scalar fields on any geometry:** values per vertex, per element or per cell on meshes, B-reps, terrain, point clouds and volumes, drawn through colour ramps and transfer functions, with legends, and readable by a pick. A layer of its own, not a per-content feature.
2. **Section planes and clip volumes with capped faces,** across every representation, with picks, snaps, measurements and ray queries that respect the cut.
3. **Point clouds and Gaussian splats** at billion scale, with classification, eye-dome lighting, and splats' ordering against other translucent content.
4. **Volumes:** voxel grids with attributes, ray-marched or as isosurfaces, sharing ray marching with f-reps.
5. **Per-element overrides at scale, as the styling language (owner, 2026-11-10):** colour, transparency, visibility and emphasis for millions of elements, changing over time (4D). Not a separate override system: the styling language that compiles to one GPU kernel interface for every kind of geometry (§8, the general vector pipeline) applies to tiles' features too, evaluated per feature when its inputs change rather than per vertex each tick. Its extensions for this: data the application supplies at run time, keyed by stable element ID (a column or a set the style reads, so isolating 50,000 elements is an upload, not a style edit); time, reading the clock or 5d's time-bound values; display modes beyond colour and show (emphasis, X-ray, outline); and the join from stable 64-bit element IDs to each tile's local feature indices, made when a tile loads, into the world's tables.
6. **Printing to scale:** orthographic plan and profile views, exact line weights, and output at a resolution beyond the screen.
7. **AR and VR through WebXR,** including aligning a model with a physical site.

**Application uses, not engine features (owner, 2026-11-10).** Two needs the domains share are the application's, built on general engine pieces. The engine's job is to make them possible without anything specific to them:

- **Vertical exaggeration** is a placement: a non-rigid map scaling height above a reference surface. The factor, which content it applies to, and the surface it's measured from are the application's. It is the placement review's acceptance test (§13.26): an application exaggerates everything, the globe and terrain included, through placements alone, with bounds, culling, picks, snaps and measurements going back through the inverse so that measurements report true heights and name their frame.
- **Comparison** (a swipe, a split view, two dates or designs side by side) is linked views and viewports, which the engine has. A coloured difference between two captures is an analysis the application runs, drawn through scalar fields (1).

**Where upcoming steps should allow for them:**

| Step                                               | Allow for                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5c, bodies in one world                            | Volumes, clamping and impostors follow the drawn, placed surface, so an application's exaggerating placement needs nothing more from them                                                                                                                                                                                    |
| 5d, controllers and animation                      | Time-bound values that scale to millions of elements (5), evaluated on the GPU rather than per element in JavaScript; view linking and viewports general enough for an application's comparison views; the orthographic camera as the base for printing (6); an XR camera and its controller (7) as one more controller kind |
| §13.26, the placement review (before B-rep step 5) | Its acceptance test: an application exaggerates everything, globe included, through placements alone; clip and section planes (2) in the same coordinates as placement                                                                                                                                                       |
| 5f, design space                                   | Plan and profile views and printing to scale (6) as design view's deliverable; the GPU snap pass respecting clipping (2)                                                                                                                                                                                                     |
| §13.33, B-reps, steps 3, 5 and 7                   | Queries that respect clipping (2) and read scalar fields (1); section caps (2) on B-reps in tessellation; exact picks through a cut                                                                                                                                                                                          |
| The vector design (§13.27, §13.29)                 | The styling language's extensions for overrides (5): run-time data by stable element ID, time and display modes; the columnar store holding that data; labels and billboards carrying data; GIS feature services and vector tiles; drillhole intervals as styled lines; catenaries through curves through placement          |
| The frame graph and later rendering plans          | Point clouds and splats (3) and their translucency; a volume pass (4) shared with f-rep ray marching; eye-dome lighting as a post stage; the mobile profile (tile-based GPUs, in the handbook's Mobile tab)                                                                                                                  |
| §13.16, ray queries                                | Clipping (2) in ray answers; point clouds and volumes as ray targets                                                                                                                                                                                                                                                         |
| 5i, the API review                                 | Element IDs, and overrides as the styling language with run-time data (5); the scalar field layer (1); one section and clip API across representations (2); the XR entry point (7)                                                                                                                                           |

**Gallery examples that would each prove one:** a drillhole and geological-surface scene (f-reps, interval tubes, translucent terrain, exaggeration); a block model cut by a moving section with a colour ramp; a bridge's analysis results (deformation, a stress contour, a moment diagram); a classified point cloud beside a splat capture of the same site, with a swipe; a 4D sequence on a timeline; a flood's depth animated over terrain with flow arrows; a transmission line with catenaries, clearances and classified lidar; and a road corridor's plan view printed to scale.

More examples (owner, 2026-11-10), each pushing something the list above doesn't:

- **A tunnel through geology:** an alignment through layered rock, the terrain see-through, a section moving along the tunnel, and the camera underground. Clipping with caps through f-reps and meshes; translucent terrain; navigation below ground.
- **Cut and fill:** a design surface against existing terrain, coloured by depth of cut or fill, with a volume readout. A scalar field from two surfaces' difference; terrain clipping; measurement accuracy.
- **A process plant:** piping and equipment of millions of elements; isolate a system, X-ray the rest, select from an element tree. Overrides at scale as styling (5), and analytic B-reps (pipes are cylinders and tori). The strongest test of the override design: wanted before the API review settles it.
- **A building by storey:** a slider clipping above each floor, indoor navigation, the city around it. Clip planes driven by data; picks through the cut.
- **Inspection photos:** drone or street photos placed as camera frusta; one opens into its viewpoint, overlaid on the model, with defects found in the photos linked to elements. Oriented imagery projected onto models.
- **A geophysical survey:** flight lines coloured by measured values, a gridded result draped on terrain, and a 3D inversion volume with an editable transfer function. Volumes; scalar fields on lines, rasters and voxels together.
- **Change between two scans:** two captures of one structure, deviation as a heat map, and a swipe between dates. Comparison as linked views; a difference as a scalar field; point clouds.
- **Changes between two versions of a design model:** added, removed and modified elements coloured, with a slider between versions, read through ion's new APIs for it (to be read when the work starts). Overrides as styling with run-time data by stable element ID; comparison.
- **Underground utilities:** pipes and cables at their depths under see-through ground, styled by attribute, with an upstream trace highlighting what connects. The vector design; overrides; translucent terrain.
- **A viewshed:** what an observer at a point can see, shaded across terrain and models, with the observer dragged about. A visibility pass from a point (a depth map in every direction, as a point light's shadow), drawn as a scalar field, and checked against the measure module's line-of-sight rays on the CPU.
- **Sun hours on a city:** hours of direct sun on façades for a chosen day, as a heat map. Uses the physical sun and shadows already built, accumulated into a scalar field: an early proof.
- **Rail clearance:** a train's clearance envelope swept along the track, clashes with structures marked. Curves through placement; sweeps; clash display.
- **A drawing sheet:** a title block with plan and section viewports at stated scales, printed. Printing to scale.
- **An agent replay in a station:** pedestrian simulation played back, with a density heat map on the floors. Live points (§13.11) and the timeline: an early proof.

## 14. Follow-ups

Issues found along the way that belong to other projects or teams. Each
links to where it is explained.

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | For                  | Where                              | Status                           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------- | -------------------------------- |
| 1   | A tileset without the required top-level `geometricError` makes 1.x compute `NaN` for the root's early-out SSE, so the root is never skipped. `Stepwise` copies it; `Budgeted` falls back to the root's error for refinement and never hides the tileset.                                                                                                                                                                                                                                                                                                      | CesiumJS 1.x         | §12 (selection parity)             | Asked whether known or by design |
| 2   | Children-bounds culling vs refinement: a parent stays visible while every child is culled by its own children-bounds check, so 1.x selects a very coarse tile (SSE 446 near the Brooklyn Bridge).                                                                                                                                                                                                                                                                                                                                                              | CesiumJS 1.x         | §12 ("A second 1.x selection bug") | To file                          |
| 3   | iTwin mesh exports omit the top-level `geometricError` that 3D Tiles requires (the trigger for item 1).                                                                                                                                                                                                                                                                                                                                                                                                                                                        | iTwin mesh export    | §12, increment 6                   | To raise                         |
| 4   | Add `Timing-Allow-Origin` to the ion tile CDN (`assets.ion.cesium.com`). Without it browsers hide per-request timing (time to first byte, connection setup) and possibly the negotiated protocol from clients, which protocol-aware request scheduling wants. Google's tile host already sends it.                                                                                                                                                                                                                                                             | Cesium ion           | §13.2                              | To ask                           |
| 5   | The same header on the iTwin mesh-export CDN.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | iTwin Platform       | §13.2                              | To ask                           |
| 6   | Distribution of real users' bandwidth and latency (CDN logs or opt-in telemetry), to choose `Budgeted`'s defaults for slow vs fast links and L1′'s network profiles.                                                                                                                                                                                                                                                                                                                                                                                           | Cesium ion / product | §13.3, increment 6                 | To ask                           |
| 7   | Content fetches have no timeout and no retry: a failed tile stays failed (with a warning) for the session, and a request that never answers holds a slot of its origin's window until no view needs the tile (cancelled after 30 frames). Wanted: a timeout from observed latency, retries with backoff for network errors, 5xx and 429 (`Retry-After`), 404 drawn as empty, and a token refresh on 401 for ion.                                                                                                                                               | 2.0 streaming        | §15, increment 2                   | Planned                          |
| 8   | `QuantizedMeshTerrainData.interpolateHeight` returns undefined for every loaded globe tile: it scales u and v to 0..32767 before branching, and the mesh branch compares them with texture coordinates decoded to 0..1; the other branch's quantized buffers are freed once the mesh exists. `sampleTerrain` works only because it fetches fresh terrain data.                                                                                                                                                                                                 | CesiumJS 1.x         | §15, increment 5                   | To file                          |
| 9   | `Cesium3DTileset.getHeight` (what 1.x clamps models to on 3D Tiles) misses geometry the renderer draws: on OSM Buildings it found no surface at 25 of 49 and 18 of 29 grid points that `Scene.sampleHeight` hits, and a lower surface (up to 53 m) at 4 more per view. Causes in reach: geocentric ray, first tile with any hit instead of the nearest hit, `pickModel` culling back faces.                                                                                                                                                                    | CesiumJS 1.x         | §15, increment 5                   | To file                          |
| 10  | `sampleTerrain` keeps a position's input height when sampling fails after a mesh was built, instead of returning undefined.                                                                                                                                                                                                                                                                                                                                                                                                                                    | CesiumJS 1.x         | docs/clamping-1x-spec.md §5        | To file                          |
| 11  | Terrain height callbacks pass terrain-only heights, so a clamp-to-ground billboard can drop off a tileset roof until a tileset callback fires.                                                                                                                                                                                                                                                                                                                                                                                                                 | CesiumJS 1.x         | docs/clamping-1x-spec.md §2        | To file                          |
| 12  | `Model.pick` passes 5 arguments to `pickModel`'s 7, so `result` lands in `ellipsoid`; tile content works by accident.                                                                                                                                                                                                                                                                                                                                                                                                                                          | CesiumJS 1.x         | docs/clamping-1x-spec.md §5        | To file                          |
| 13  | `HeightmapTerrainData` mesh-path heights ignore `heightScale` and `heightOffset` after `createMesh` (latent; reached for LERC).                                                                                                                                                                                                                                                                                                                                                                                                                                | CesiumJS 1.x         | docs/clamping-1x-spec.md §5        | To file                          |
| 14  | Loading 1.x from a CDN or a bundler is a common struggle. Consider backporting 2.0's approach for 1.148.0: locate workers, wasm and assets from `import.meta.url` in the ESM build (no `CESIUM_BASE_URL`, nothing to copy), keeping the blob shim 1.x already uses for cross-origin workers. First collect the failures users actually report (forum, issues) to confirm this is what they hit. Coordinate with PR #13669 (WebAssembly in workers, CSP guide): it adds worker URL options and documents `CESIUM_BASE_URL` per policy, which this would change. | CesiumJS 1.x         | §13.12 (pages without a build)     | To bring to the team             |
| 15  | 1.x's bundled Basis transcoder needs `'unsafe-eval'` in its workers; PR #13669's guide asks applications to build their own with `-s DYNAMIC_EXECUTION=0`. 2.0 instead patches the four embind code generators in the same vendored glue at build time (closures, as Emscripten emits without dynamic execution; identical output on 72 transcodes), so a strict worker policy needs only `'wasm-unsafe-eval'`. 1.x could ship the same patch for 1.148.0 and make strict CSP work out of the box.                                                             | CesiumJS 1.x         | §13.12 (pages without a build)     | To bring to the team             |

## 15. M3 progress

### Increment 1 (r23): quantized-mesh terrain through the shared streaming

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

### Increment 2 (r24): globe `Stepwise` selection and L1 parity

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

### Increment 3 (r25): horizon culling in selection; `Budgeted` on terrain

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

### Increment 4 (r26): imagery, the ellipsoid globe, camera, display-referred color

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

### Content in and out of a live world (r27)

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

### Increment 5 (r29): height queries and clamping

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

## 16. Benchmark suite (design)

**Purpose.** Measure 1.x and 2.0 on the same scenes, repeatably, to
guide product decisions and engineering tradeoffs as the engine grows,
and catch regressions. Rendering and runtime only for now: streaming,
selection, CPU and GPU time, memory, interaction. Tiling is out of scope
here, but the schema leaves room for it (dataset lineage, §16.2), since
the 2.0 tiler will shape runtime performance.

**What exists (r29).** `bench/run.mjs` (Playwright, Edge, one JSON file
per run, `BENCH_COMMIT` snapshots for bisecting), synthetic 1.x vs 2.0
baselines (`baseline`), first frame, allocation gate (`alloc`), live-world
hitches (`hitch`), L1′ quality over time with a throttled link (`lod`),
Chrome traces of slow frames (`trace.mjs`), and parity suites. Private
assets already stay out of the repo through environment variables
(`ION_ASSET`, `IMODEL`). The suite generalizes these instead of
replacing them.

### 16.1 Concepts

- **Dataset**: one piece of content (3D Tiles, glTF, terrain, imagery,
  point cloud, splats, vector tiles), where it lives, its license, size
  and checksums.
- **Scene**: datasets placed together, with globe, imagery, lighting,
  canvas size and per-engine settings matched for equal quality.
- **Scenario**: what happens in a scene: a camera script (recorded
  flythrough, orbit, jump into an uncached area), interactions (pick
  bursts, content added and removed, moving clamped entities, split
  views), cache state (cold or warm), network profile, duration and settle
  rule.
- **Engine adapter**: one interface per engine and version: `load(scene)`,
  `setCamera(pose)`, `frame()`, `settle()`, `metrics()`, `dispose()`.
  Adapters for 1.x (this repo's build or a pinned release) and 2.0 first;
  native runtimes, other web engines or a 2.0 in a worker are more
  adapters, not a new suite.
- **Run**: scenario × engine × environment × repetition, with its
  results and the fingerprint of everything that produced them.

Camera scripts are engine-neutral: time-stamped float64 Earth-fixed poses
and field of view, recorded in either engine and replayed in both.

### 16.2 Manifests and storage

- **Public manifest in the repo** (`bench/catalog/public.json`): public
  datasets (§16.4) with URLs or ion asset IDs from 1.x's public
  Sandcastles, licenses, sizes and checksums, and the scenes and
  scenarios built on them.
- **Private manifests outside the repo**, same schema, found through
  `BENCH_MANIFEST` (a path, or a Bentley-internal repository): private
  ion assets, iTwin exports, internal file shares and large CAD models.
  Private datasets carry an alias (`cad-plant-01`) that is all that
  appears in results, so reports can be shared without names, IDs or
  paths. Tokens and share keys never go in manifests; they come from the
  environment (`.env.local`), as today.
- **Content-addressed local store** (a configurable directory, outside
  the repo): files stored by SHA-256, each dataset pinned by the hash of
  its sorted file list (a Merkle root). `bench fetch` downloads and
  verifies; `bench verify` re-checks before a run; a run refuses a
  dataset whose root changed. A local server serves the store, so runs
  don't depend on remote networks, and network profiles shape that
  server instead of the internet.
- **Remote-only content** (Google Photorealistic 3D Tiles, ion streaming
  where terms don't allow mirroring) runs live: the scenario records that,
  and results carry the measured network conditions so they are compared
  with care. Mirror only what the license allows.
- **Lineage** (for later): a dataset may record its source and how it was
  derived (tiler, version, settings), so tiler changes become comparable
  runs of the same source.
- **Licensing (required for every dataset).** Each catalog entry carries a
  reviewed license (name, status, where it was checked); the loader refuses
  entries without one. The public catalog holds only data whose license is
  compatible with CesiumJS's Apache-2.0 license ("redistributable": public
  domain, CC0, CC BY, Apache, MIT...) or references streamed from a provider
  under its terms and never copied ("stream-only": Cesium ion sample assets,
  Google 3D Tiles). A private manifest holds only data cleared for
  commercial use at Bentley ("commercial-ok", redistributable data, or
  stream-only through Bentley's own account). Non-commercial and
  unreviewed licenses are excluded from both; only redistributable data is
  mirrored. Cesium's sample assets (through 1.x's default token) and
  Google Photorealistic 3D Tiles are cleared for internal Bentley
  benchmarking; Cesium can adjust its own assets' terms as needed.
  Publishing results is not cleared: results stay internal (outside the
  repo) until it is.
- **Synthetic datasets** come from deterministic generators (draw count,
  instances, materials, textures, feature counts, a seed), checksummed
  by generator version and parameters; nothing to download.

Later: a proper asset store (versioned object storage with access
control, a registry service, dataset cards with previews) behind the same
manifest schema.

### 16.3 Measurement and statistics

- **Metrics**: frame time distribution (p50/p95/p99, frames over 2 and 3
  vsyncs), main-thread CPU per frame, GPU time (2.0: timestamp queries;
  1.x: `EXT_disjoint_timer_query_webgl2` where the browser exposes it,
  else frame time only), long animation frames, JS heap and GC, GPU
  memory (2.0's accounting; 1.x's statistics where available), requests
  and bytes, time to first frame, time to settle, quality over time
  against a settled reference (L1′ FLIP), API calls per frame, selected
  tiles and draws. Power and thermals later (laptops).
- **Fairness**: the same canvas size and pixel ratio, content and camera;
  1.x at its defaults and at settings matched to 2.0's settled quality
  (SSE, HDR off where 2.0's output is compared to 1.x's), both reported.
- **Repeatability**: verified datasets, pinned engine builds (commit or
  release), a fixed browser build and flags, warm-up runs, several
  repetitions with 1.x and 2.0 interleaved (cancels thermal drift and
  background noise), cooldowns, high-performance power settings. Medians
  with bootstrap confidence intervals; a difference is reported only when
  the intervals separate.
- **Environment fingerprint**: GPU adapter (vendor, architecture,
  description), CPU class, memory, OS, browser version and flags, display
  refresh rate, and the WebGPU limits and features in use. Driver
  versions come from the runner (OS tools), not the page.
- **Privacy of results**: results with machine identifiers stay in the
  results store, not the repo; the repo gets summaries by hardware class.
- **Controlled and recorded conditions** (built, r32):
  - recorded per run: GPU clocks, temperature, power, utilization and the
    driver's slowdown reasons (`nvidia-smi`), CPU speed relative to
    nominal and whole-machine utility (Windows counters), power source
    and plan, driver version, the browser's WebGPU adapter (features,
    limits, WGSL features) and WebGL renderer, and the full software
    stack;
  - controlled by the runner: each run starts within 3 °C of the idle GPU
    temperature (cooldown) and after the machine is quiet (CPU utility near
    its idle level), a wake lock keeps the machine and display awake for
    the whole run (no settings change), and configurations alternate;
  - reported: conditions per engine for every scene, flagged when true
    conditions differ: the GPU's temperature at the start (more than
    3 °C), its share of thermal slowdowns (more than 0.2), CPU speed (more
    than 10%) or how busy the machine was before the run (more than 10
    points); timelines of the whole run. GPU clock and power are shown but
    not compared: on power-managed GPUs they follow each engine's own load
    (the first full pass flagged every scene on clocks alone, r33).
  - thermal limits: the GPU's target temperature and slowdown threshold
    are recorded with the setup, and its thermal headroom (`nvidia-smi`
    T.Limit, °C below the throttle limit) with every sample; a run that
    throttled thermally, or came within 5 °C of the limit, is valid only
    with a warning.
  - render settings (r33), declared in the catalog and the same for every
    engine, with scene and configuration overrides; each run records what
    the engine actually used (drawing buffer, MSAA, HDR, FXAA, fog) and the
    report flags differences:
    - pixel ratio 1 by default (1.x's own default on high-DPI displays; 2.0's
      `CanvasTarget` takes a fixed `pixelRatio`, used by selection too), and
      `--dpr` / `--pixel-ratio device` for high-DPI runs;
    - 4× MSAA (2.0's only setting so far), no FXAA, no fog (2.0 has none
      yet; 1.x fog also lowers distant detail);
    - primitive outlines off (`CESIUM_primitive_outline`, drawn by 1.x by
      default on OSM Buildings; 2.0 parses but doesn't draw them yet:
      a parity item to build);
    - HDR: 2.0 tonemaps lit color and shows unlit color display-referred
      (r26); 1.x tonemaps everything when HDR is on, so it runs with HDR on,
      and off for scenes of mostly unlit content (imagery, photogrammetry,
      Google tiles). Mixed scenes (lit buildings on imagery) can't match
      exactly in 1.x;
    - the globe's color without imagery: 2.0's gray (0.62, 0.62, 0.6) in
      both (1.x's default is blue; it dominated image parity, FLIP 0.83 on
      the BIM scene);
    - a fixed sun (elevation 40°, azimuth 150° over the start of the camera
      path), a directional light in both engines; 1.x otherwise follows the
      wall clock, 2.0 had a placeholder.
    - Still different: 1.x lights 3D Tiles with an environment map built
      from its atmosphere (and pays for it each frame); 2.0 has its own
      sky-colored IBL until M4's atmosphere. Lit scenes (OSM buildings)
      look brighter and bluer in 2.0 for that reason, not styling (no style
      is applied in either; the styling language is M6).
  - vsync: the default scenarios run twice, with vsync (the experience:
    missed vsyncs, stutter) and uncapped (`uncapped-orbit`: Chromium
    without vsync or a frame-rate limit, in a second browser), where frame
    time is the frame's real cost. Vsync hides everything under 16.7 ms
    and 1.x has no GPU timer queries in Chromium, so uncapped frame time
    is the only view of 1.x's GPU-bound cost.
  - Locking clocks and power states needs administrator rights and
    changes machine settings, so a person applies them, once per runner
    machine, and the suite records the state: GPU clocks locked
    (`nvidia-smi -lgc`, where the driver allows it; laptops often don't),
    CPU minimum and maximum processor state at 100% in a high-performance
    power plan, the driver's "prefer maximum performance", dynamic power
    sharing (laptop Dynamic Boost) off where possible, AC power, a fixed
    display refresh, background work (updates, indexing, scans) paused.
    Dedicated runner machines (v2) are configured this way once.
  - Not corrected: timings are not scaled by clock (the relation isn't
    linear); runs under different conditions are flagged or rerun.
- **Diagnostics on demand**: a run that regresses can be rerun with
  Chrome tracing and V8 sampling (`trace.mjs`), and the trace is attached
  to the result.

### 16.4 Catalog (initial)

Three groups. Public datasets are verified for license before they enter
the public manifest; anything that needs conversion (IFC, PLY, LAS) waits
for the tiling part of the suite, or is converted once outside the suite
and pinned as a derived dataset with its lineage.

**A. What Cesium has always been used for** (1.x strengths; public ion
assets from 1.x's Sandcastles): Cesium World Terrain with Bing imagery;
Cesium OSM Buildings; Google Photorealistic 3D Tiles; photogrammetry
(Sandcastle "3D Tiles Photogrammetry", Melbourne, Aerometrex San
Francisco); New York City buildings; the BIM design model and AEC samples;
Japan Buildings (PLATEAU, 200+ cities in one tileset) with Japan regional
terrain; the Montreal point cloud (about 10 billion points); Gaussian
splats with LOD; vector 3D Tiles and global rivers; the CDB Yemen tileset;
Maxar's One World Terrain globe; Mars and the Moon.

**B. Large public datasets** (open data, mirrored where licenses allow):
PLATEAU per-city 3D Tiles (terms allow commercial use; to be confirmed as
compatible with redistribution before mirroring); USGS 3DEP lidar (public
domain, tens of trillions of points as EPT and COPC; a source for
point-cloud tiling later); the Netherlands' AHN lidar (license to review);
classic rendering scenes (Amazon Lumberyard Bistro, CC BY 4.0; Sponza,
license varies by version, to review) and Khronos glTF samples (each
model's own license; the Cesium milk truck is CC BY 4.0); buildingSMART
and BIMData IFC samples (per-file licenses, to review). Excluded by the
licensing rule: the UNC Power Plant (non-commercial) and Disney's Moana
Island (custom license restricting use) unless a review clears them. Bentley's iTwin sample iModels (Bay
Town Process Plant, the Philadelphia metro station, a stadium) are public
templates created per account, so they are listed through private
manifests by alias.

**C. Where 2.0's architecture should win** (mostly private manifests and
generators):

- very large CAD as 3D Tiles 2.0 on glTF 2.1 with instancing: process
  plants and an offshore platform from Bentley data (no large open plant
  or offshore model was found; private manifests);
- many instances: a forest, power-line poles, street furniture through
  `EXT_mesh_gpu_instancing` (generator; 100,000 to millions of
  instances);
- several heavy tilesets at once: Google + OSM + CAD + terrain;
- multiple views of one world (split views, linked views);
- dynamic content: 10,000 to 100,000 moving, clamped tracks from a
  synthetic feed at 1-10 Hz (§13.11; instanced models until billboards
  exist);
- very large Gaussian splat datasets: 1.x struggles with them even with
  splat LOD (its sort and per-frame upload), where 2.0 sorts on the GPU
  in compute (M6, "Gaussian splats with GPU sort", which this group
  needs first). Sources: 1.x's splat Sandcastles (ion 4547222, the
  Microsoft Redmond campus with multiple LODs, the largest; ion 3667784,
  a power station, with its mesh twin 3443919; the iTwin Gaussian splats
  Sandcastle), public research captures (Mip-NeRF 360, Tanks and Temples;
  licenses to check), and large private captures by alias. Measures:
  sort time, frame time against splat count, and quality while moving;
- huge feature counts with picking and styling;
- content in and out of a live world over long sessions (hitches, memory
  stability);
- later: vector tiles and billboards at scale (§13.9), path tracing
  (§13.10).

### 16.5 Interfaces: agents, scripts and people

Mostly agents and automation run the suite, so the command line and JSON
are the primary interface: `bench fetch | verify | run | report`, every
option a flag or a scenario file, machine-readable output, nonzero exit
on failed checks or detected regressions. People get the same
capabilities in a browser:

- **Runner UI**: pick a catalog (public, private when its manifest is
  present), scenes, scenarios, engines and commits; see dataset status
  (fetched, verified, size); run with live progress and a live view of
  each engine rendering side by side; stop, repeat, or rerun one
  scenario with tracing.
- **Results UI** over the results store:
  - _Comparison_: 2.0 against 1.x (or any two commits, engines or
    configurations) per scene and metric, with confidence intervals,
    frame-time distributions and timelines, and screenshots or short
    captures from both at the same moments (with FLIP heatmaps where
    quality is compared).
  - _Trends_: each metric over commits and time per scene and hardware
    class, change points marked, so slow drifts show up as well as
    step regressions; click a point to open that run.
  - _Experiment log_: every run with what changed (commit, branch,
    settings, flags, environment) and a note, so tuning experiments
    (an upload budget, a selection policy) are recorded and comparable
    later instead of living in chat logs.
  - _Drill-down_: a run's per-frame data, attached Chrome traces, and the
    exact manifests and hashes it used, to reproduce it.

**Experiment tracking (built, r32).** As ML experiment trackers manage
training runs, the results page treats every run as an experiment:
parameters (commit, branch, configurations, hardware and browser, catalog,
repetitions, tags, a note) and metrics (per scene and configuration, with
intervals). Its views:

- _Trends_: chosen metrics (toggle chips, remembered) for one scene or
  all scenes (geometric mean), per configuration, run to run and commit
  to commit, filtered by hardware.
- _Runs_: the experiment log, newest first, with headline ratios.
- _Compare_: two runs per scene for one configuration, as forest plots
  (the commit-to-commit regression view).
- _Report_: one run's full report.

The report itself is overview first, details on demand: verdict tiles
(geometric mean ratio across scenes and how many scenes were better,
worse or not distinguishable), a forest plot per headline metric, the
hardware conditions over the run, then each scene's frame timelines,
metrics and conditions (collapsed), and the setup. Charts follow the
data-viz method: one axis per chart, thin marks, engine identity in
validated categorical colors, better and worse in status colors with an
icon and a label, a table twin for every chart, crosshair readouts.

Next: notes and tags editable in the page (written back to the run),
saved views, change points marked on trends, filters by tag and branch,
a pinned baseline run, parameter columns in the log.

Both UIs are views over the same files and store, built as pages served
by the suite's local server (like the parity pages), with the plan's
dashboard work (v2) hosting the results UI for the team.

### 16.6 Engines and versions

- **1.x**: this repository's build at a pinned commit, or a published
  release from npm (for history: how 1.x itself changed).
- **2.0**: any commit through the existing snapshot mechanism.
- **The same scenario, page and harness for both**: the adapter is the
  only engine-specific code, so a third engine or a variant (2.0 with a
  policy, a feature flag, engine-in-worker) is one more adapter or
  configuration.

**Released 1.x builds (built, r32).** A 1.x configuration runs this
repository's build or a released CesiumJS from npm, fetched once with
`npm pack` into the store outside the repo (`BENCH_CESIUM_DIR`), checked
against npm's integrity hash and served locally. Catalogs pin an exact
version (1.146.0 today), so a new release starts a new trend line
instead of silently changing an old one across a release window. The
default comparison is 2.0 against the pinned release.

**Engine names (r36).** One grammar everywhere (`bench/suite/engines.mjs`):
a release by its version (`1.146.0`; "1.x" always means "a CesiumJS 1
build", never a release), an engine from the working tree (`2.0`, `1.x`),
or one built at any git ref (`2.0@main`, `1.x@v1.140`), with settings
after `+` (`2.0+stepwise`, `2.0+sse=32`). Runs record the working tree
under its branch (`2.0@cesium-2.0-webgpu-poc`), so after a merge the same
engine continues as `2.0@main`, and a branch can be run against a release
and against main at once (`--engines 1.146.0,2.0@main,2.0`). Refs are
checked out once into snapshot worktrees (`.bench/<sha>`): 1.x is built
there on first use, 2.0 gets a dev server of its own. The catalog lists
setups (engine settings without a build: `1.x`, `2.0`, `2.0+stepwise`)
and the default engines, baseline and candidate; budgets name a setup and
apply to every build of it. People see readable names: "1.146.0",
"2.0 · main", "2.0 · cesium-2.0-webgpu-poc · stepwise selection".

**Historical sweeps.** `--releases 1.120.0..1.146.0` (or a list) adds one
pinned configuration per published release, to see how 1.x itself
changed release by release on the same scenes and hardware. The adapter
uses 1.x's asynchronous loading APIs (about 1.104 and later); older
releases need an older adapter variant and are reported as errors until
then.

**Engines on a new machine (r50).** The first run on a second machine
(a Mac) found the release store empty: only a benchmark run filled it,
so Dyno's Viewer listed 1.146.0 and 1.147.0 and failed to start either
("not found"), while the first-run check said "Ready" (the dev server
answers a missing file with the app's page, 200). Now:

- `npm run setup --workspace @cesium/next` (scripts/setup.mjs) builds
  this repository's 1.x if `Build/CesiumUnminified` is missing and
  fetches the catalog's default releases into the store. Neither is
  committed.
- The dev server fetches a release the first time a page loads it
  (GET only, so probes never download), and lists what it can serve at
  `/cesium-release/index.json`: the store's releases and npm's latest six
  stable ones. The Viewer offers those beside the catalog's, marking the
  ones that download on first use.
- The first-run check counts a file as present only when the answer
  isn't the app's page.

**Planned: engines at git refs from Dyno.** The CLI already builds any
ref (`1.x@v1.140`, `2.0@main`: snapshot worktrees in `.bench/<sha>`, 1.x
built there on first use, 2.0 on a dev server of its own). Dyno should
offer the same: type a branch, tag or commit in the engine picker, and
the dev server resolves it (`git rev-parse`, fetching the remote ref if
needed), checks it out into a snapshot worktree and builds it, with the
build's progress and log in the page; the engine then joins the
Viewer's and the Explorer's choices beside releases and the working
tree. Open: building a ref's 1.x takes minutes and a gigabyte, so the
store needs a size cap and an LRU (or a "remove" action), and 2.0 at a
ref needs its own dev server, which the Viewer would load in an iframe
or through a proxy path.

### 16.7 Scope of v1 (milestone "Benchmark suite v1")

Schemas; public manifest; private manifest loader with aliases; local
store with fetch and verify; local content server with network profiles;
1.x and 2.0 adapters; 10-15 scenes; the report; a first runner page and
results page (comparison and trends over local results). Runs on one
machine, by hand or by script.

### Built (v1, r32)

`bench/suite/`:

- `schema.ts`: datasets (source, formats, reviewed license, checksum),
  scenes (globe, imagery, layers, camera script), scenarios (cold or warm
  cache, motion seconds, settle timeout), engine configurations, metrics.
- `catalog/public.json`: 19 public datasets and 15 scenes in groups A and
  C; `private.example.json` shows a private manifest (aliases, licenses,
  Bentley's own token).
- `manifest.mjs`: loads and merges catalogs, enforces the licensing rule,
  checks references, and reports engine gaps by format (2.0: point clouds,
  splats, vector; 1.x: the instancing generator for now). As 2.0 gains a
  format, its scenes start running there.
- `store.mjs`: Merkle checksums of local datasets, `verify`, and `fetch`
  for mirrored ones (content-addressed store outside the repo).
- `suite.html` / `suite.ts`: the page; 1.x and 2.0 adapters (setup,
  frame, settled, content drawn, camera); engine-neutral camera scripts
  (orbits from 1.x's heading-pitch-range convention, `frame` from the
  tileset's root volume); the scenario (load until settled, orbit, settle
  again) and its metrics. A person picks a scene and engine and presses
  Run.
- `cli.mjs`: `list`, `verify`, `fetch`, `run` (each run a fresh browser
  context; configurations rotate per repetition; requests and bytes from
  the browser, workers included), `report`. Results and reports go
  outside the repo (`BENCH_RESULTS`).
- `stats.mjs` (medians with bootstrap intervals, ratios that count only
  when the intervals separate) and `report.mjs` (a self-contained page per
  run).

Open for v1's exit: the results page with trends across runs, scenes for
group B (after license review), warm-cache and throttled scenarios in the
default set, the 1.x instancing generator, real-time tracks (§13.11).

### Findings to work through (r33)

From the first full pass and the phase 1 verification runs, to be
addressed in 2.0 (each with a Dyno scene to show the fix):

- **`Budgeted` selection draws visibly differently from 1.x**, most
  apparent on Mount Rainier (terrain and imagery): in-between and settled
  views pick different levels than `Stepwise`. Wanted: a parity pass on
  `Budgeted` against a fully refined reference (§4 L1′) per scene, the
  explorer's paused streaming and the filmstrip's FLIP to find where it
  under-refines, and an image guardrail in the scorecard so a faster
  policy can't pass by drawing less. The explorer's selection view (r34)
  shows it directly: on the Rainier path at 30%, settled, 2.0 draws 20
  terrain tiles spanning levels 0 to 12 (six of them at levels 0 to 5)
  where 1.x draws 57 at levels 6 to 13, and only 4 tiles are the same.
  _Cause (r37)_: on terrain, `Budgeted` used 3D Tiles' dynamic SSE (up to
  24 pixels off distant tiles, density from the whole-globe root), which
  took mid-distance tiles below zero SSE at oblique views. 1.x's globe
  lowers the SSE only by fog (at most 2 pixels), and only while fog is
  drawn. `GlobeBudgetedSelection` uses the globe's term (off while 2.0
  draws no fog); settled at the same camera, 2.0 draws 68 tiles and 1.x
  67, all 67 shared, level for level.
- **Content under the globe is hidden** (r37, Aerometrex San Francisco):
  2.0 depth-tests every tile against the globe, so the photogrammetry's
  ground, about 30 m below the WGS84 ellipsoid there (geoid), draws under
  the ellipsoid and only the tall buildings show. 1.x clears depth after
  the globe unless `Globe.depthTestAgainstTerrain` is set (default off),
  so tiles always draw over it. _Decided (r37, §8 product choices)_: real
  terrain occludes; the bare ellipsoid never does. Aerometrex now matches
  1.x.
- **Settle time on terrain scenes**: Rainier ×1.16 and OSM Philadelphia
  ×1.42 slower than 1.x. The waterfall shows 2.0 fetching 49 content tiles
  (18.7 MB) on OSM Philadelphia to 1.x's 31 (10.7 MB), and starting them
  later. _r37_: terrain loaded one level per round trip under `Budgeted`
  (expanded only once loaded); fixed, with parallel adapter setup: Rainier
  now settles ×0.74 of 1.x, OSM Philadelphia within noise. See the planned
  `Budgeted` work (§6), which now lists these findings first.
- **Bytes**: NYC buildings ×3.3 and OSM Philadelphia ×1.5 of 1.x; Japan
  ×1.3.
- **JS heap** above 1.x on terrain scenes and NYC (scorecard guardrail).
  _r39_: a measurement artifact (§6, JS heap); 2.0 holds less JS heap than
  1.x everywhere measured, and 4 to 5 times its buffers.
- **Benchmarks take the GPU and stop development (r39).** A terrain
  comparison (3 scenes, 3 engines, 3 reps) took 26.5 minutes: 54 runs of
  about 26 s, 15 s of them motion, 10% cooldown; two of the three engines
  were baselines that can't change. Done (r39):
  - **Frozen production builds** (`frozen.mjs`): a run commits the
    working tree as it stands into a commit object (a temporary index;
    branch, index and files untouched; the same tree on the same HEAD
    freezes to the same commit), checks it out into one reused worktree
    (`.bench/tree`) and builds the suite and FLIP pages for production
    once per commit, in seconds; 1.x's harness and 2.0 load from it, and
    snapshots at refs build the same way. Edits during a run don't reach
    it. `--dev` serves the live tree.
  - **A startup scenario** (`cold-start`: load, settle, memory; no
    motion): about 10 s a run instead of 26. Its default plan has time to
    settle as the primary and first content as a guardrail.
  - **Baseline reuse** (`reuse.mjs`): an engine that can't change (a
    release, a commit, the frozen tree), never the candidate, runs one
    calibration repetition per scene; within the stored spread (CPU per
    frame where the scenario moves, else time to settle with a wider band)
    the other repetitions come from stored runs with the same machine,
    method (the measuring harness's files), build and settings, scene and
    data, marked `reused`; else all run. `--no-reuse`.
  - **Early stop**: a scene's remaining repetitions are skipped once,
    after at least two, the primary metric's interval lies wholly past
    the tolerance and each guardrail is clearly within or past its own.
    A smaller primary change gets every repetition: with two repetitions
    a bootstrap interval is too narrow to call one (NYC stopped on a 3%
    difference before this rule). `--no-early-stop`.
  - **Areas and tiers** (`areas.mjs`, the catalog's `areas` and `tiers`):
    areas name source paths (terrain, streaming, content, render,
    instancing, core), scenes list the areas they exercise; `--changed
[ref]` runs the scenes of the areas a changed file falls in (nothing
    when no measured code changed), `--areas` names them. Tiers: quick
    (startup, reuse, early stop), standard (the orbit), full (every
    scene, both orbits, motion quality).
  - **Annotations**: dated notes on Dyno's trend charts, at the first run
    on or after their date and only on their metrics' charts when named:
    method changes in `bench/suite/annotations.json`, machine and data
    notes in the results directory (`cli.mjs annotate`).

  The quick tier on the terrain area (3 scenes, 2.0 against 1.146.0):
  16 runs in 2.5 minutes, then 10 runs (1.146.0 calibrated within its
  stored spread on every scene; two scenes stopped after two
  repetitions), 127 s → 78 s inside runs. The orbit at three repetitions
  would have been 36 runs and about 16 minutes. Still planned:
  - Content served from the local store through a server that shapes
    the link per connection (latency, bandwidth, HTTP/2), for both
    engines' main threads and workers, where licenses allow mirroring;
    mainly for variance (Philadelphia's cold first content ranged 1.3 to
    2.7 s for 1.x alone over the live network). Google's tiles stay live.
  - Guardrails decided "within tolerance" after two repetitions share
    the narrow-interval caveat; a permutation bound for small samples
    would be sounder than the bootstrap there.

- **Lighting**: 1.x lights tilesets with an environment map from its
  atmosphere; 2.0's own IBL is brighter and bluer until M4 (§16.3).
- **Primitive outlines** and the other extensions in §4.1.

### 16.8 Later (v2 and beyond)

- **v2 (with M5)**: dedicated runner machines (GPUs are not available on
  shared CI), nightly and per-merge runs, a results store (time series),
  a dashboard, change-point detection (E-Divisive means, as MongoDB and
  Apache Otava use) instead of thresholds, automatic bisection with
  `BENCH_COMMIT`, traces on regressions.
- **v3 (Cesium-wide)**: a matrix across OS, browser (Chrome, Edge,
  Safari, Firefox with WebGPU), GPU vendor and driver, and device class
  (desktop, laptop, mobile); the tiling half (source → tiler → tileset,
  then runtime); native runtimes as adapters; the asset store; shared
  public reports.

### 16.9 Analysis and experience design: learning from analogous systems

Experiment trackers such as Weights & Biases were built for training runs.
Graphics benchmarking is closer to a mix of race telemetry, web
performance monitoring, online experimentation, manufacturing quality
control and game frame analysis. This section starts from what the suite
has to do, borrows from the fields that already solved each job, and
phases the result into the suite's milestones (§16.7, §16.8).

**Principles.**

- Every view answers one of six jobs: decide, detect, diagnose, trust,
  explore, communicate.
- Overview first, then zoom and filter, details on demand; every claim
  carries its interval.
- Validity before verdict: a result is shown as a verdict only when its
  run was valid.
- Runs of one scene are aligned by camera progress, not wall time, so
  engines and commits are compared at the same place on the same path.
- One click from an alert to its cause: the regressed scene, the place on
  the path, the frames, the requests, the trace.
- Graphics terms in the app and reports (camera path, path segments,
  frame cost); the analogies below are sources, not vocabulary.
- The suite, the examples (§13.12) and parity (§4) share scene
  definitions, so a showcase, its measurement and its image check never
  drift apart.
- Results stay internal (§16.2); views can be shared inside Bentley.

#### Decide: is B really better than A?

Borrowed from online experimentation platforms (Statsig, Eppo, Optimizely,
Microsoft's experimentation platform), canary analysis (Netflix and
Google's Kayenta), Go's `benchstat` and clinical trials.

- _A declared primary metric and guardrails._ Each comparison names its
  primary metric (e.g. CPU per frame, or settle time) and guardrail
  metrics that must not get worse (memory, long frames, bytes, image
  parity), declared in the catalog or the run (`--plan`) before results
  exist, so nobody picks the flattering metric afterwards.
- _Validity checks before any result_ (the experimentation platforms'
  sample-ratio checks): both engines ran the same scenes, repetitions and
  datasets (checksums), under comparable conditions (§16.3); otherwise
  the comparison says why it isn't valid instead of showing a verdict.
- _Variance reduction_ (CUPED-style): adjust run metrics with
  measurements taken before each run (idle clocks, temperature, machine
  utility) where that demonstrably narrows intervals; report both.
- _A scorecard_ (Kayenta): each metric tested per scene (bootstrap ratio,
  §16.3), weighted into pass, marginal or fail overall; the merge gate for
  2.0 changes and the verdict line on every report.
- _A terse comparison table_ (`benchstat`): old, new, change with interval,
  per scene and metric, for pull-request comments and the CLI.
- _Forest plots_ (clinical trials): already the report's per-scene view.

#### Detect: did something get slower, or slowly drift?

Borrowed from statistical process control in manufacturing, Mozilla
Perfherder, Chromium's performance dashboard and Pinpoint, change-point
detection (MongoDB, Apache Otava) and Grafana annotations.

- _Control bands on trends:_ an expected band (mean ± 3σ of a stable
  baseline window, per scene, metric and hardware class), with simple
  run rules that catch drift (several runs in a row on one side, a trend
  of rising points), not only steps. Humans read these at a glance.
- _Change points_ (E-Divisive means, §16.8) marked on trends.
- _Alerts with triage:_ a detected regression or improvement becomes an
  alert with a commit range, the affected scenes and metrics, and a state
  (new, acknowledged, expected, invalid, fixed), plus who owns it and a
  note; an alerts view is the reviewer's queue (Perfherder's sheriffs).
- _Automatic bisection_ (Pinpoint): an alert can run the affected scenes
  on commits inside its range (`BENCH_COMMIT` snapshots) until the culprit
  is found, and attach the result.
- _Annotations:_ commits (messages, authors), CesiumJS releases, driver
  and browser updates and catalog changes drawn as markers on every
  trend, so a step lines up with its cause.

#### Diagnose: why is it slower?

Borrowed from Formula 1 telemetry, WebPageTest, Digital Foundry, Honeycomb
BubbleUp, frame analysis tools (CapFrameX, AMD OCAT, NVIDIA FrameView)
and trace viewers (Perfetto, Tracy, Unreal Insights).

- _Cost along the camera path with a delta trace_ (F1's lap overlay):
  frame time, CPU and GPU per frame for both engines (or two commits)
  against progress along the same camera path, with a line of the
  difference; _path segments_ (a timing screen's sectors): each third of
  the path with each engine's cost, its gap to the lowest and a verdict;
  and a _path map_ (F1's track dominance map): the camera path from
  above, each stretch in the color of the engine clearly faster there.
  Where in the scene a difference happens becomes obvious.
- _Filmstrip_ (WebPageTest): screenshots of each engine at fixed moments
  (first content, settled, every quarter of the motion), side by side,
  with the image-parity FLIP score and heatmap (§4) under each pair, so
  "faster" is never mistaken for "drawing less".
- _Side-by-side video with overlays_ (Digital Foundry): optional
  recordings of both engines on the same path with frame time and
  progress overlaid, for reviews and stakeholders.
- _Request waterfall_ (WebPageTest): every content request over time per
  engine (queued, waiting, receiving; bytes; tileset; host), aligned with
  the load phase, to explain settle-time differences (the open OSM
  Philadelphia question, §15).
- _Frame-time percentile curves and stutter metrics_ (frame analysis
  tools): the full percentile curve of frame times per engine, "1% low"
  style metrics, hitch counts by size, frame-time variance; better than a
  single p95.
- _"What differs" analysis_ (BubbleUp; built in a first form, r33: each
  grouped alert lists the scene attributes far more common among the
  affected scenes than among all measured ones): for a regression, compare the
  regressed runs or scenes with the rest across every recorded dimension
  (scene group, content format, tileset, phase, hardware, browser
  version, driver, conditions) and rank the dimensions that explain it.
- _Traces one click away:_ a regressed run is rerun with Chrome tracing
  and V8 sampling (`trace.mjs`) and the trace opens in Perfetto from the
  report; GPU frame captures later.

#### Trust: can the result be believed?

Borrowed from 3DMark's result validation, MLflow's lineage, data-quality
monitoring in particle physics and visual-regression tools (Chromatic,
Skia Gold).

- _A validity verdict per run:_ valid, valid with warnings or invalid,
  from the recorded conditions (cooldown reached, machine quiet, clocks
  and slowdown shares comparable between engines, wake lock held, AC
  power), dataset checksums, catalog and license checks and errors; shown
  before any number and carried into trends (invalid runs hidden by
  default).
- _Lineage_ (built, r33: command, commit, working-tree diff hash, catalog
  and dataset checksums, engine builds, plan, render settings, in each
  report): every number links to what produced it (commit, catalog and
  dataset checksums, engine builds with integrity hashes, browser,
  driver, settings) so any run can be reproduced exactly.
- _Reference overlays and a review checklist_ (data-quality shifts): the
  nightly run's distributions drawn over reference distributions, and a
  short checklist for whoever reviews them.
- _Image baselines_ (visual-regression tools): parity images per scene
  approved or rejected like visual-regression snapshots, in the same
  report as performance.

#### Explore: what do parameters do?

Borrowed from hyperparameter tools (W&B sweeps, Optuna, TensorBoard's
HParams) and hardware result browsers (3DMark, Geekbench).

- _Sweeps as experiments:_ screen-space error, upload budget, selection
  policy, cache size, the CesiumJS version across a release sweep
  (§16.6): each sweep a set of runs with its parameters.
- _Parallel coordinates and parameter importance:_ which parameters move
  which metrics, and how much.
- _Hardware scaling:_ the same scenes across GPUs and machines, per engine
  (normalized by hardware class), once several runner machines exist.

#### Communicate: what does this mean for the product?

Borrowed from W&B Reports, Lighthouse and performance budgets, and Strava
segments.

- _Narrative reports:_ a page that combines live charts and text (a
  release comparison, a design decision), built from saved views.
- _Budgets_ (built, r33): per scene and metric limits (Lighthouse
  budgets) that turn red when exceeded. The catalog's `budgets` hold §5's
  targets (CPU per frame at most ⅓ of 1.x, time to settle at most ½,
  frame p95 within 17.5 ms with vsync, no hitches over 100 ms), checked in
  every report and drawn as limit lines in the workspace. The first full
  pass breaks the CPU budget in 8 of 10 scenes and the settle budget in 9
  of 10: the targets are not met yet.
- _Scene pages_ (Strava segments): each catalog scene as a segment with
  its history, each engine's best result and when it got there, its
  filmstrip over time, and the commits that moved it.

#### Name

The suite and its app are called **Dyno**, after the engine dynamometer:
the rig that measures engines under controlled, repeatable conditions,
as Dyno does for 1.x and 2.0.

#### Information architecture of the tracking app

- _Workspace_ (built, r33; W&B-style, replacing Trends): a runs sidebar (color, eye
  toggle, search, filters by tag, branch, hardware, validity; grouping);
  collapsible sections (Headline, Loading, Rendering, Network and memory,
  Conditions) of compact panels in a 2–3 column grid; the headline
  section shows the candidate/baseline ratio per metric with interval
  bands and a reference line at ×1; panels show one line per
  configuration with interval bands, control bands, annotations and run
  dots; each panel can split by scene into small multiples; clicking a
  point opens that run; a pinned baseline run draws a reference line;
  saved views and shareable URLs.
  Built as `workspace.ts`: runs sidebar (show or hide each run, search,
  hardware and validity filters, ★ to pin the reference run), sections
  Headline (candidate over baseline with intervals and ×1), Loading,
  Rendering, Network and memory, Conditions; per configuration lines with
  their intervals; a control band for the candidate (mean ± 3σ of the
  earlier runs, once there are six) with Western Electric rules 1 and 4;
  markers where a configuration first appears or the hardware changes;
  split by scene (and scenario); click a point for its report; view state
  in the URL and saved views by name. Summaries now keep scenarios apart
  and carry conditions and validity (`cli.mjs resummarize` rewrites old
  ones). Commit subjects show where a run has no note.
- _Alerts_ (built, r33): the triage queue (§16.9, Detect).
  `changepoints.mjs` runs E-Divisive means (energy statistic, binary
  segmentation, permutation test at p < 0.05, O(n²) per split) on each
  metric's run medians per scene, scenario, configuration and hardware,
  and keeps changes of 3% or more; alerts are grouped like Perfherder's
  alert summaries (one change across scenes), triaged in Dyno (new,
  acknowledged, expected, invalid, fixed; owner; note) into
  `triage.json` beside the results, and listed by `cli.mjs alerts`
  (`--fail-on-new` for nightly jobs). Checked on a synthetic 20-run
  history with planted steps: every step found, no false alerts.
- _Run:_ the report (verdict and validity first, scorecard, tiles, forest
  plots, then per scene: cost along the camera path, path segments and
  path map, filmstrip, waterfall, percentile curves, metrics, conditions;
  setup and lineage).
- _Compare:_ any two runs or configurations, with the scorecard, forest
  plots and path overlays.
- _Scenes_ (built, r33): the segment pages (`scenes.ts`): every scene
  and scenario with its latest result per configuration; a page per scene
  with its content and licenses, best results per configuration (when and
  at which commit), history panels, the change points that moved it, and
  the filmstrip over time; links to the explorer and the workspace.
- _Sweeps_ (built in a first form, r33): `cli.mjs run --sweep
param=a,b,c` runs each 2.0 configuration (or `--sweep-configs`) once
  per value (any configuration field, e.g. `maximumScreenSpaceError`,
  `policy`, `render.pixelRatio`); release sweeps (`--releases`) count too.
  The Sweeps tab plots each metric against the values, with the baseline
  as a reference and the image difference from the baseline (FLIP) beside
  the costs, so a cheaper setting that draws less shows it. Parallel
  coordinates and parameter importance come with multi-parameter sweeps.
- _Hardware_ (built in a first form, r33): the latest ordinary run per
  hardware class, candidate over baseline per headline metric; fills in
  as runner machines are added.
- _Reports:_ saved narratives.
- _Explorer_ (built, r33): the scenes, live and interactive, as a Dyno
  tab (a module loaded on first use; the 1.x build is injected on demand,
  and switching 1.x builds reloads the page, since 1.x is a page
  global). Pick a catalog scene and one or two engines (a release
  such as 1.146.0, or the working tree's 1.x or 2.0 with a setup), side
  by side.
  - _Camera path:_ both cameras on the scene's benchmark camera path;
    play, scrub, change speed.
  - _Free flight:_ fly either engine with the mouse (1.x's camera
    controls, 2.0's `GlobeController`) to inspect the content; with
    linked cameras the engine you touch leads and the other follows
    exactly; a readout of the camera's longitude, latitude and height.
  - _Pause streaming:_ keep what is selected and loaded now and fly
    around it (1.x `debugFreezeFrame` and the globe's LOD suspension;
    2.0 `Tileset3D.freezeSelection`), to see what each engine selected
    and what it culled.
  - A HUD per engine: CPU and GPU per frame, frame time (shared), loading
    state. State in the URL (scene, engines, place on the path), and each
    report scene links to it.
  - For looking, not measuring: two engines share one GPU and main
    thread, and the page says so.
  - Built since (r33): tile statistics in the HUD (drawn and loading
    tiles; 2.0's requests and bytes, 1.x's tile memory); tiles colored by
    tree depth in both engines with one palette (2.0
    `Tileset3D.debugColorizeTiles` via `World.setColor`; 1.x's own colors
    are random, so the suite tints by depth itself); deep links from the
    report (a click on a path chart opens that point of the path, filmstrip
    frames open their moment); "Measure this" gives the CLI command for the
    scene and engines.
  - Built (r34): bounding volumes (white at final resolution, yellow
    while finer tiles load, gray without content: 1.x's colors) and
    content volumes (blue) in both engines, through 1.x's own
    `debugShowBoundingVolume` and 2.0's new
    `Tileset3D.debugShowBoundingVolume` (line-list wireframes under the
    tileset's transform; regions follow the ellipsoid); tiles tinted by
    depth, or by engine (gray where both draw the tile, the engine's color
    where only it does; tiles match by header, terrain by quadtree
    address, so the two selections compare exactly; 1.x's globe takes no
    tint); "Selection by depth", each engine's drawn tiles per level with
    those only it draws. 2.0's terrain now applies the draw tint over its
    imagery (white unless a debug view tints).
  - Next: screen-space error coloring, picking a tile for its metadata
    (header, SSE, distance, state, bytes), and the inspector below in
    place of the HUD.
  - Later, authoring benchmarks: the explorer becomes where new
    benchmarks are made. Record a camera path from free flight
    (keyframes, smoothed into a spline, with timing) and save it as a
    scene's camera script; load other content (an ion asset, a tileset or
    glTF URL, a local file, a dataset from the private manifest), place
    it, and save the result as a catalog scene: public scenes go through
    the license review (§16.2), private ones into the private manifest
    outside the repo; then a first measured run from the same tab.

#### Experience (r33)

Dyno's shell is React with Radix Themes (`app.tsx`); the views stay
imperative modules drawing into the page body, with their state in the
URL. Practices applied:

- Navigation by job (Track: Workspace, Alerts, Runs, Compare; Inspect:
  Scenes, Explorer, Images; Explore: Sweeps, Hardware), counts of what
  needs attention on the items (untriaged regressions, unreviewed
  images), and a page header saying what each view is for. The run report
  is a page reached from Runs, alerts, the palette or a workspace point,
  with a way back.
- A command palette (Ctrl/⌘ K) over views, scenes and runs; keyboard
  shortcuts (g then a letter, / to search, ? for the list).
- Light, dark or system theme, chosen in the sidebar; charts and the
  report follow it (the report renders in a shadow root, not an iframe).
- Radix tokens for every neutral surface and control (buttons, inputs,
  selects, chips, focus rings); data and status colors stay on the
  validated palette.
- Feedback: a loading state between views, toasts for saves, copies and
  approvals, clickable table rows, explanations once per section instead
  of on every panel, long labels truncated.
- Also built: workspace panels expand full width in a dialog (Esc
  closes); Compare starts from the two latest ordinary runs, offers only
  shared configurations and warns when machines or render settings differ;
  the workspace marks runs where the render settings changed.
- Built (r34), the app rebuilt on standard parts: every view is a React
  component using Radix Themes controls directly (selects, segmented
  controls, checkboxes, sliders, dialogs, tables); TanStack Router on
  hash history gives each view typed, validated search params (shareable
  links, back and forward work), loads each view as its own chunk, and
  reads the runs once in the root loader with a pending state instead of
  a top-level await; React's StrictMode is on (the explorer's engines
  survive mount, unmount, mount: 2.0 cleanly, 1.x at some extra start-up
  cost). Charts stay the strings charts.mjs builds, which the CLI's
  reports share, hosted by one component. Old `?tab=` links redirect. A
  guided first run (`/start`, and wherever a view needs runs and there
  are none) checks the setup live (WebGPU, the 1.x builds, the results
  directory), gives one command for a first measured run and says where
  to look next.
- Next: persistent column choices in tables; the inspector (below).

#### Dyno on StrataKit (r35)

Dyno is built on StrataKit, Bentley's design system (MUI themed by
`@stratakit/mui`, plus `@stratakit/structures` and `@stratakit/icons`),
as Sandcastle is; Dyno also battle-tests it, and what got in the way is
logged for the StrataKit team in `bench/suite/STRATAKIT_FEEDBACK.md`.
`bench/suite/DESIGN.md` sets the information architecture, page anatomy,
copy rules and component choices; every view follows it.

- _Served at the dev server's root_ (`/#/overview`); hash routes per view
  with typed search params; no compatibility with earlier routes (Dyno
  has one user so far).
- _Navigation by job_, a StrataKit navigation rail in three groups:
  results (Overview, Trends, Runs, Alerts), scenes (Scenes, Explorer,
  Images), workbench (Analysis: sweeps and machines; Lab), with Getting
  started, shortcuts and the theme in its footer. Compare is reached
  from Runs (select two), alerts and links. The Cesium logo and wordmark
  head the rail.
- _Overview_ (new, the landing page): the latest run's verdict and
  validity, the headline changes in words ("1.3× faster", "13% more
  data"), budgets met or missed, what needs a look (untriaged
  regressions, images to review, invalid runs) and the recent runs.
- _Copy_: sentence case, buttons that say what they do, changes in words
  with the raw ratio on hover, one sentence per page header with details
  in help popovers, empty states that say what to do next.
- _Lab_: every parity check, microbenchmark and spike is a module with two
  hosts (`lab/harness.ts`): Dyno mounts it at `/#/lab/<id>`, and its own
  .html page hosts it alone for the CLI runner (`bench/run.mjs`), which
  measures in a page with nothing else on the main thread.

#### Inspector (designed r34, built r37)

Built as designed, in `packages/next/widgets/`: `Inspectable` (a
snapshot an engine fills in as far as it can measure), `inspectEngine`
for 2.0, Dyno's 1.x adapter for 1.x, and `attachInspector` with every
readout the viewer panel had. Beside it, `Viewer` (2.0's counterpart to
`Cesium.Viewer`: canvas, engine, world, view, controller, globe and
imagery, credits, content with its attributions, framing, split view,
overview inset, sun, picking) and the credits widget. Dyno's Viewer page
runs one engine at a time on it (or `Cesium.Viewer` for 1.x), and the
standalone viewer is gone. Still open: per-pane settings controls in the
Explorer (deliberately absent: they would undo the comparison), and a
resizable docked panel.

The standalone debug viewer (`viewer/`) splits three ways:

- _Engine core: debug features as APIs, no UI._ Statistics, the content
  pipeline's stage timings, requests, `freezeSelection`, bounding
  volumes, tile tints, picking. The core stays headless and
  framework-free; apps pay nothing for it.
- _An inspector overlay, its own module outside the core_ (the viewer's
  right panel: problems, view, streaming, content pipeline, GPU and
  memory, pick, lighting), attached to any engine
  (`attachInspector(engine, element)` or a `<cesium-inspector>` element),
  written without React so any app can use it (as 1.x's
  `CesiumInspector` and `Cesium3DTilesInspector` were widgets, not core).
  It reads a small inspectable interface rather than 2.0's internals: 2.0
  implements it natively and Dyno's 1.x adapter implements it too, so the
  explorer shows the same inspector beside both engines (replacing its
  HUD).
- _Dyno owns content and workflows._ The viewer's content loading (ion
  assets, URLs, local files, the test-page list) moves into the explorer,
  where benchmark authoring is planned anyway; parity and benchmark links
  are Dyno's already. The standalone viewer then retires, or shrinks to a
  few lines that make an engine and attach the inspector.

Order: the inspectable interface (from what the viewer panel and the
explorer HUD show), the inspector, then content loading into the
explorer.

#### New data the runs record

- Camera progress for every frame (already implied by the motion series)
  and the camera position, for path maps (built, r33).
- Screenshots at fixed moments per run (filmstrips), in the results store;
  optional video. Built (r33): the settled views after loading and after
  motion, first repetition, as JPEGs beside the results, with FLIP and
  its heatmap against the baseline.
- Request records per run: start, time to first byte, end, bytes, host,
  kind (built, r33; tileset and engine later).
- A per-run validity verdict and its reasons; the scorecard per
  comparison (built, r33).
- Alerts and annotations as their own records in the results store
  (status, owner, notes), editable from the app.
- Declared plans (`--primary`, `--guardrails`, `--tolerance`,
  `--hypothesis`; default primary CPU per frame, guardrails settle time,
  frame p95, hitches over 100 ms, bytes and JS heap, 10% tolerance)
  stored with the run (built, r33).

#### Phasing

- _With v1's exit_ (now). Built in phase 1 (r33): the Explorer (camera
  path, free flight, linked cameras, paused streaming); cost along the
  camera path with a delta trace, path segments and a path map;
  filmstrip with FLIP; frame-time percentile curves and stutter metrics
  (hitches over 100 ms, p99.9, spread); request waterfall and bytes over
  time; validity verdicts; scorecard with declared primary and guardrail
  metrics; `cli.mjs compare` (`benchstat`-style) and the table after each
  run; uncapped scenarios; thermal headroom; the workspace (r33, below).
- _v2_ (with M5): alerts and triage, change points, automatic bisection,
  pull-request comments, scene pages, "what differs" analysis, traces
  from the report, side-by-side video.
- _v3_ (Cesium-wide): sweeps view, hardware scaling, narrative reports,
  budgets, reference overlays and the review checklist.
- _Deferred (r34, decided):_ the CI image job on a software rasterizer
  (§16.10) and automatic bisection of alerts wait until after the
  Explorer's inspection tools and Dyno's controls are done; they need CI
  runners and a build per commit, which the prototype does not have yet.

Sources for §16.4, §16.8 and §16.9 (checked October 2026; licenses to be
confirmed at the source before mirroring):
[PLATEAU streaming tutorial](https://github.com/Project-PLATEAU/plateau-streaming-tutorial/blob/main/3d-tiles/plateau-3dtiles-streaming.md),
[Awesome PLATEAU](https://japan-opendata.github.io/awesome-plateau/),
[USGS 3DEP on AWS](https://www.usgs.gov/news/technical-announcement/usgs-3dep-lidar-point-cloud-now-available-amazon-public-dataset),
[3DEP COPC on Planetary Computer](https://planetarycomputer.microsoft.com/dataset/3dep-lidar-copc),
[UNC Power Plant](http://gamma.cs.unc.edu/POWERPLANT/),
[ASWF open assets](https://lf-aswf.atlassian.net/wiki/spaces/DPEL/pages/11436337/Links+to+Open+Assets),
[BIMData IFC files](https://github.com/bimdata/BIMData-Research-and-Development/blob/master/pages/IFC_FILES.md),
[iTwin sample iModels](https://www.itwinjs.org/learning/tutorials/create-test-imodel-sample),
[Change point detection at MongoDB](https://arxiv.org/pdf/2003.00584),
[Hunter / Apache Otava](https://ar5iv.labs.arxiv.org/html/2301.03034).

### 16.10 Image regression in Dyno

Image regression belongs in Dyno, not in a separate app: it needs the same
scene definitions, engine adapters, capture, FLIP (§4), results store,
lineage and review UI, and a change is judged on both axes at once
("faster" must not mean "drawing differently"). What differs is the run,
not the system, so Dyno gets a second kind of run with its own command,
CI job and tab.

- _Two questions, two baselines._
  - Parity (§4 L2): does 2.0 draw what 1.x draws? 2.0 against 1.x on the
    same scene and pose, judged with FLIP thresholds (mean ≤ 0.05, p95
    ≤ 0.2) and the drift sources §4 lists. This is what the filmstrip
    already shows per performance run.
  - Regression: did a change alter what 2.0 draws? 2.0 against its own
    approved image of the same check, near-exact (FLIP p95 near 0 on the
    same machine class), so any change is either approved or a bug.
- _Checks, not runs._ An image check is a scene, a pose (or a moment on
  its camera path), a time of day, a size and an engine configuration,
  captured once settled. It is deterministic: fixed size and device pixel
  ratio, fixed `JulianDate`, `Stepwise` selection or a selection settled
  to full detail, no frame-time dependence, animation stopped. The
  catalog's scenes supply poses; the parity pages (`parity/*.html`)
  become checks; the explorer can save the current view as a check.
- _Baselines._ Approved images per check and per renderer class (GPU
  vendor and architecture, or a software rasterizer in CI). Stored like
  results, outside the repo where the content's license forbids
  redistributing renders (Google tiles, most ion assets); public content
  cleared for it may keep small baselines in the repo. Each approval
  records who, when, the commit and the reason.
- _Command and CI._ `cli.mjs images [--update]` captures every check,
  compares against its baseline, writes a report and exits non-zero on
  unapproved differences; a JUnit and Markdown summary for CI and pull
  requests. In CI it can run without a GPU on a software rasterizer
  (SwiftShader for WebGPU and WebGL), with its own baselines, on offline
  content (`Specs/Data`, generated scenes) so it is fast and needs no
  network; nightly runs on runner machines add real GPUs and streamed
  content. Performance runs stay on real hardware only.
- _Review in Dyno (an Images tab)_, after Chromatic and Skia Gold: a
  queue of changed checks, each with the baseline and new image side by
  side, a swipe, a flicker toggle and the FLIP heatmap (§4 L3), and
  approve or reject (approvals go to the baseline store, or to a commit
  for in-repo baselines); history per check; and "open in the explorer"
  at that pose in both engines.
- _During development:_ the same command on one scene or check
  (`--checks`), and the Images tab against the local results, so a
  developer sees what a change does to images before pushing.
- _Phasing:_ v2 (with M5) for the checks, baselines, command, Images tab
  and CI on a software rasterizer; v3 for real-GPU nightly baselines
  across runner machines.
- _Built (r33):_ `images.mjs` and `cli.mjs images` (checks at
  `scene.checks` points of the camera path, default the start; FLIP
  against the approved baseline per renderer class, thresholds mean 0.01
  and p95 0.05; `--parity` captures the pinned 1.x release too and scores
  it against §4 L2; `--update` approves; `--software` runs on SwiftShader;
  JSON, JUnit and Markdown output; exit 1 on changed or new images);
  `runCheck` in the suite page; Dyno's Images tab (side by side, swipe,
  flicker, FLIP heatmap, parity view; approve copies the image into the
  baselines, reject records why). Streamed scenes repeat within FLIP
  0.002–0.006 mean and 0.04 p95 run to run (selection settles slightly
  differently); a fully refined check mode would make them exact. Next:
  the CI job on SwiftShader with offline content (deferred, r34: see
  §16.9 phasing), checks saved from the explorer, parity pages as checks.

### Increment 6 (r31): M3 close-out

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
