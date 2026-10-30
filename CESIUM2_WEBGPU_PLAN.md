# CesiumJS 2.0 on WebGPU — Proof-of-Concept Plan

Branch: `cesium-2.0-webgpu-poc` (off `main` @ `587f52f1eb`, CesiumJS 1.146.0)

## Revisions

| Rev | Change                                                                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r1  | First draft: clean-slate WebGPU engine, 1.x used as the parity oracle                                                                                                                                                                                                                                                                                                                    |
| r2  | Added multiple viewports, Slang shaders, compute-shader uses, and globe/terrain/imagery to the PoC                                                                                                                                                                                                                                                                                       |
| r3  | Tile selection made pluggable (`Legacy1x` vs improved `Next`). Folded in an external review against current industry practice, research and WebGPU status (late 2026). Main changes: GPU-driven submission from M1, no bindless in the PoC, Slang scope narrowed, a texture-array imagery cache, corrected MSAA/feature-ID and OIT plans, and new M0 precision tests. Sources are in §9. |
| r4  | Plan-owner decisions recorded (§8): Slang + WGSL ABI; **HDR + tonemapping by default**; all four multi-view scenarios including **linked views**; `packages/next` in TypeScript with new math; Chromium-first, core WebGPU only; 3D Tiles before globe. Canonical CAD test data to come from team-chosen ion assets.                                                                     |
| r5  | M0 findings: multisampled `r32uint` is invalid in WebGPU, so feature IDs use `rg16uint` (lo16, hi16). On dual-GPU Windows laptops Chromium ignores `powerPreference` and follows the per-app Windows graphics setting, so benchmarks must record the adapter and launch Chromium on the discrete GPU.                                                                                    |
| r6  | M0 spike results recorded in §10: L2 parity harness, GPU precision, engine-in-worker, indirect-draw overhead. Indirect draws cost measurable GPU time on Intel/D3D12, so §3.3 submission now batches before going indirect.                                                                                                                                                              |
| r7  | Spikes rerun on the NVIDIA GPU; Slang spike run (passes, perf gate deferred to unquantized timing in M1). §10 rewritten with both GPUs.                                                                                                                                                                                                                                                  |
| r8  | M0 close-out: automated runner (headless Edge, unquantized timestamps), FLIP validated against NVIDIA's reference and integrated, 1.x performance baselines, Metal deferred.                                                                                                                                                                                                             |
| r9  | M1 increment 1: worker glTF pipeline, draw records v1, materials and textures, batching. Decisions: exact sRGB over matching 1.x's gamma 2.2; translucency designed clean-slate and tested against an exact reference instead of 1.x's WBOIT.                                                                                                                                            |
| r10 | Translucency becomes a unified compute compositor shared by translucent meshes and Gaussian splats; MBOIT is the overflow fallback.                                                                                                                                                                                                                                                      |
| r11 | M1 increment 2: PBR + compute-built IBL, normal maps, lit parity vs 1.x, Slang re-ported to v1 records with a surface-material interface; Slang performance gate passes.                                                                                                                                                                                                                 |
| r12 | M1 increment 3: Draco and KTX2/Basis decoding in the workers; all 14 opaque Khronos samples within 0.025 mean FLIP of 1.x in every lighting mode.                                                                                                                                                                                                                                        |
| r13 | M1 increment 4: steady-state allocation gate (engine ~1.5 KB/frame, independent of draw count, down from ~45 KB) and first-frame cost (2.0 first frame 23–34 ms vs 1.x 203–691 ms).                                                                                                                                                                                                      |
| r14 | M1 increment 5: CAD content. Per-vertex feature IDs (EXT_mesh_features, b3dm _BATCHID) with property/batch tables and picking, b3dm, line primitives, ion asset auth, tileset parity page. An iModel-derived CAD tileset matches 1.x apart from translucency (M4). M1 exit met.                                                                                                          |
| r15 | Demo viewer (`/viewer/`). M2 started: freeing placed models, per-view record view masks, and the `Legacy1x` selection spec extracted from the 1.x base traversal (§12).                                                                                                                                                                                                                  |
| r16 | M2 increment 1: streamed 3D Tiles with `Legacy1x` selection per view over one shared cache. L1 selection parity 100% on 36 view comparisons (9 public tilesets and 3 iModel-derived CAD tilesets, 3–4 simultaneous views each). Viewer streams.                                                                                                                                          |
| r17 | M2 increment 2: OSM Buildings streams with 100% selection parity (Philadelphia, Manhattan); batch-table hierarchy; resize robustness (frame ordering, bounded render-target memory); viewer split view, memory panel and collapsible sections.                                                                                                                                           |

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

### 3.4 Shaders: Slang for materials, WGSL for kernels, a WGSL-level user contract

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
  - **`Legacy1x`** reproduces 1.x selection exactly (3D Tiles SSE 16 with REPLACE/ADD and request volumes; globe SSE 2 with horizon culling). It exists for **fair comparisons** and deterministic parity tests.
  - **`Next`** (default) improves on it:
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
  - horizon culling in the cull kernel
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

The harness is `parity/` side-by-side: a 1.x `Viewer` (WebGL) and a 2.0 `Engine` (WebGPU), driven by **one serialized camera state** and a fixed `JulianDate`, with the same assets and default settings. Parity runs use `Legacy1x` selection. Color is judged on 2.0's exact sRGB pipeline, and translucency against 2.0's own exact reference mode rather than 1.x (r9). Because 2.0 defaults to HDR, the primary image baseline is **1.x with `scene.highDynamicRange = true`** and the same tonemapper. A secondary LDR-vs-LDR run covers 1.x's out-of-the-box default.

| Level                     | Check                                                                                                         | Pass criterion                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| L0 math                   | Ellipsoid/Transforms/Sun/projection vs 1.x; **hi/lo precision on Metal, D3D12 and Vulkan**                    | ≤1e-12 relative (CPU); bounded error in meters at canonical distances (GPU) |
| L1 selection (`Legacy1x`) | Selected 3D Tiles and terrain tile IDs after load settles                                                     | ≥ 99% Jaccard (target 100%)                                                 |
| L1′ selection (`Next`)    | Image error vs a fully refined reference; bytes downloaded; time-to-full-detail; popping with a static camera | better than `Legacy1x` on most metrics and no worse on any                  |
| L2 image                  | NVIDIA FLIP mean / p95 vs 1.x screenshot                                                                      | mean ≤ 0.05, p95 ≤ 0.2 (tune in M0)                                         |
| L3 look-dev               | Swipe slider plus flicker toggle                                                                              | human sign-off                                                              |

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

- `TileSource`, SoA tile table, `Legacy1x` policy, RequestScheduler with ion and P3DT auth, engine-wide cache with per-view tracking, b3dm unwrap.
- First cut of the `Next` policy: skip-LOD and budget-driven refinement.
- _Exit_:
  - OSM Buildings, the CAD tileset and photogrammetry stream.
  - `Legacy1x` L1 ≥99% in two views.
  - `Next` L1′ is measured.

### M3 — Globe (≈3–4 wks)

- Quantized-mesh terrain; horizon culling in the kernel.
- Imagery sources plus the **texture-array composite cache**.
- Height queries and clamping.
- _Exit_: the CAD tileset sits on Cesium World Terrain with ion imagery; globe `Legacy1x` L1 ≥99%.

### M4 — Visual parity (≈3 wks)

- Sky and atmosphere LUTs, ground atmosphere and fog.
- LDR/HDR paths, FXAA.
- Translucency: MBOIT real-time path plus the per-pixel-linked-list exact reference; tested for opaque/translucent interaction against the reference, not against 1.x.
- _Exit_: L2 on all canonical views, and L3 sign-off.

### M5 — Performance hardening (≈3 wks)

- Two-phase occlusion culling (optional if targets are already met).
- HZB tile-coverage feedback into `Next`.
- Upload budgeting; the remaining `Next` stability and prediction work; benchmark CI.
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

### 7.3 Project risks

- **Schedule**: 5–6 months across everything here is optimistic. Droppable in this order:
  1. M6
  2. two-phase occlusion culling
  3. MBOIT (keep the exact linked-list mode, at its higher cost)
  4. `Next` prediction and GPU feedback
  5. pixel-exact horizon-culling parity
- **Globe scope**: defaults plus terrain and imagery only.
- **Parity rabbit holes**: thresholds plus L3 sign-off.
- **Draw-record format churn**: designed in M1 with the globe's needs, so M2 and M3 don't break it.

## 8. Decisions

Recommendations already adopted from the review: core-only (no compatibility mode); camera-relative offsets computed in compute; `instance_index` plus fallback; texture-array imagery cache; sample-0 feature-ID resolve; two-phase occlusion culling or none; limited render-target configurations; 32-bit two-pass point rasterization; bindless designed for but not built.

**Decided by the plan owner (r4):**

| Decision        | Choice                                                                                                                                                                                   |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shaders         | Slang for materials and vertex/fragment code; hand-written WGSL allowed for compute kernels; user contract is a WGSL-level ABI. Gated by the M0 spike, with WGSL + WESL as the fallback. |
| Default look    | **HDR + tonemapping by default**, LDR as a per-view option. Parity baseline is 1.x with HDR on.                                                                                          |
| Multi-view      | All four scenarios in the PoC: split views on one canvas, multiple canvases, offscreen targets, linked views (`ViewLink`).                                                               |
| CAD data        | Team-chosen CAD/BIM assets in Cesium ion; iModels can be tiled into ion.                                                                                                                 |
| Foundation      | `packages/next` in this monorepo; TypeScript strict; new typed-array math module tested against 1.x.                                                                                     |
| Platforms       | Chromium is the gate; Safari and Firefox best-effort; core WebGPU only.                                                                                                                  |
| Milestone order | 3D Tiles (M2) before globe (M3). The draw-record format is locked in M1 with the globe's needs included.                                                                                 |

**Still open:** none blocking M0. Exact OIT, auto-exposure and the M6 picks are decided at those milestones.

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
(batching). Deferred: the Metal precision run.

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
2. M2: streaming and 3D Tiles selection (`TileSource`, `Legacy1x`, `Next`).

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

### `Legacy1x` selection spec (from the 1.x base traversal)

`Legacy1x` must reproduce 1.x's default, non-skip-LOD selection exactly
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

### Increment 1 (r16): streaming with `Legacy1x` selection

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
- **`Legacy1x`** (`streaming/Legacy1x.ts`): the 1.x base traversal rule for
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
always traverses the root; iTwin's publisher omits the field. `Legacy1x`
copies this, with a warning. `Next` should fall back to the root's error,
and the bug is worth filing against 1.x.

Results: `2026-10-30T00-18-53-878Z` (all suites; the Slang gate read +5.7%
in that run and +1.8%, +3.3%, −1.6% on reruns).

Notes for `Next`, from viewing the CAD tilesets:

- **Silhouettes matter for design models.** iTwin's coarse tiles drop small
  elements, so at the viewer's default distance an underground CAD model shows less than a
  user expects, exactly as 1.x does. `Next` should weigh silhouette loss
  (e.g. refine sooner when children carry geometry the parent lacks).
- A track that ends at the edge of the default view may be in the data
  itself. Check it against full detail when testing `Next`.

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

Notes for `Next`:

- A small view (an inset) selects far coarser tiles than the main view,
  exactly as a small 1.x viewer would. In one engine, the finer tiles another
  view already holds can be drawn at no bandwidth cost: opportunistic
  refinement from the shared cache.

Results: `2026-10-30T00-40-56-567Z`.

Next:

1. Request scheduling closer to 1.x (priority digits, cull-requests-while-
   moving, cancellation) where it changes time-to-settle, and the memory-
   adjusted SSE.
2. A photogrammetry tileset (M2 exit).
3. `Next` policy: skip-LOD, budget-driven refinement, silhouette weighting
   and opportunistic refinement from the shared cache, measured with L1′.
4. Move the traversal off the main thread over a transferable (SoA) tile
   table.
