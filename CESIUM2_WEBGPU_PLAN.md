# CesiumJS 2.0 on WebGPU — Proof-of-Concept Plan

Branch: `cesium-2.0-webgpu-poc` (off `main` @ `587f52f1eb`, CesiumJS 1.146.0)

## Revisions

| Rev | Change |
|---|---|
| r1 | First draft: clean-slate WebGPU engine, 1.x used as the parity oracle |
| r2 | Added multiple viewports, Slang shaders, compute-shader uses, and globe/terrain/imagery to the PoC |
| r3 | Tile selection made pluggable (`Legacy1x` vs improved `Next`). Folded in an external review against current industry practice, research and WebGPU status (late 2026). Main changes: GPU-driven submission from M1, no bindless in the PoC, Slang scope narrowed, a texture-array imagery cache, corrected MSAA/feature-ID and OIT plans, and new M0 precision tests. Sources are in §9. |
| r4 | Plan-owner decisions recorded (§8): Slang + WGSL ABI; **HDR + tonemapping by default**; all four multi-view scenarios including **linked views**; `packages/next` in TypeScript with new math; Chromium-first, core WebGPU only; 3D Tiles before globe. Canonical CAD test data to come from team-chosen ion assets. |

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

| # | 1.x behavior | Cost | 2.0 answer |
|---|---|---|---|
| H1 | Every frame, primitives' `update(frameState)` rebuilds a command list; `executeCommands` walks it pass by pass (`Scene.js` ~L2779) | JS work and GC that grow with the number of visible draws | **Persistent render world**: draws are registered once and mutated only when dirty |
| H2 | Per draw, `ShaderProgram._setUniforms` calls closures from `uniformMap`, then issues one GL call per uniform | Main thread dominated by driver calls | Bind-group frequency tiers plus storage-buffer draw records |
| H3 | Log depth writes `gl_FragDepth` (on by default); multi-frustum is the fallback | Disables early-Z / Hi-Z | **Reverse-Z `depth32float`, infinite far plane**, single frustum |
| H4 | Derived commands (translucent, shadows, pick, classification, 2D) multiply state and draws | Complexity and draw count | Passes are frame-graph nodes. Pipeline variants come from a cache key |
| H5 | Picking re-renders into a pick framebuffer | Extra frame of work per pick | Feature-ID target written in the main pass, read back asynchronously |
| H6 | Main thread runs glTF processing, texture upload prep and much of the decoding | Hitches during streaming | **Worker-first content pipeline** |
| H7 | Each primitive gets its own vertex buffers and VAOs | Bind churn; draws can't be merged | **Geometry arenas** with vertex pulling |
| H8 | Shader programs compile synchronously when first seen | Compile hitches | Async pipeline creation and warm-up |
| H9 | Globe and 3D Tiles stream through separate systems; the globe shader samples every imagery layer per fragment | Duplicated logic and budgets; fragment cost grows with layer count | **One streaming framework**; imagery **composited per tile into a texture-array cache** |
| H10 | One `Scene`/WebGL context per viewer | Multi-view duplicates every resource and tile; browsers cap live contexts | **One device, many views** |

---

## 3. Architecture

```
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
```
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
  engine.views.add({ target: canvas, viewport: { x, y, width, height }, world, camera })
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
   - **Feature ID**: `r32uint`
   - **Depth**: `depth32float`, reverse-Z
   - **MSAA 4×**, with the MSAA color target as a `TRANSIENT_ATTACHMENT` where supported.
   - **Integer targets can't be MSAA-resolved.** The feature-ID target is resolved by a **custom sample-0 resolve inside the pick-readback pass**, only for the requested region.
4. **Sky / atmosphere** after opaque. Fog and atmosphere linearize reverse-Z depth.
5. **Translucent**: WBOIT in `Legacy1x` render mode, matching 1.x. **Moment-based OIT** is the `Next` default (bounded memory, correct for layered CAD glazing). Per-pixel linked lists are an exact mode post-PoC; WebGPU has no fragment interlock.
6. **Resolve and post**:
   - Exposure and tonemapping by default. The tonemapper matches 1.x's HDR tonemapper for parity; auto-exposure via a compute histogram comes later.
   - Pass-through in LDR mode.
   - FXAA.
7. **Async readback** for picks and height queries. `mapAsync` latency is 1–3 frames, which the API exposes as a promise.

### 3.6 Compute shaders: where they pay off
| Area | Compute use | Win over 1.x approach | When |
|---|---|---|---|
| Draw prep | Per-view camera-relative offsets and args writing | Precision handled in one place; enables GPU-driven draws | M1 |
| Culling | Frustum + horizon (M1–M3); two-phase HZB occlusion (M5) | CPU culling and draw-list building go away | M1→M5 |
| Imagery | Composite N layers and reproject Web Mercator → geographic into **`texture_2d_array` cache slices** | One texture fetch per fragment; one bind group for the whole globe | M3 |
| Atmosphere | 1.x scattering model precomputed into LUTs; dynamic environment map → spherical harmonics by parallel reduction | Per-pixel scattering becomes a LUT fetch | M4 |
| Mips | Compute mip generation | No render-pass-per-level mips | M1 |
| Picking and queries | Ray/height queries (`sampleHeight`, clamp-to-ground, drill pick); feature-ID sample-0 resolve | Batched and async, with no re-render | M2–M3 |
| **Gaussian splats** | Cull + 3D→2D covariance projection + spherical-harmonics evaluation → **GPU radix sort**, a portable wait-free variant without subgroups or global atomics (WebSplatter, 2026) plus a subgroup variant → indirect instanced draw. 1.x sorts in WASM on CPU workers. | CPU never touches splats; each view sorts independently | M6 |
| **Point clouds** | Compute rasterization with **32-bit atomics, two-pass** (depth min, then color where depth matches), because 64-bit atomics are only a draft proposal; EDL post-process as compute | Very large clouds without the triangle pipeline | M6 |
| Styling | Compiled style → per-feature color/show buffers | No CPU style evaluation | M6 |
| Post | Auto-exposure histogram, tonemap, FXAA/SMAA, SSAO, CAD edges | Fewer full-screen passes | M4+ |
| Classification | Compute decals, or per-pixel lists | Replaces stencil volumes that need watertight geometry | post-PoC |

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
| Technique | Verdict | Why |
|---|---|---|
| Visibility buffer / deferred texturing | **No** for the PoC; revisit when bindless ships | The material pass needs access to every visible tile's texture, which bindful WebGPU forbids. It also fights MSAA. Overdraw is modest with front-to-back sorting. |
| Meshlets / Nanite-style cluster DAG | **No** cluster hierarchies in the engine | 3D Tiles HLOD already provides streaming and LOD units. A cluster DAG is a tile-format question, not a renderer one. We take sub-tile draw records and GPU feedback from Nanite instead, and keep the draw-record format producer-agnostic. |
| Virtual texturing | **No** for 3D Tiles; the imagery array cache is a tile-aligned form of it | Per-tile photogrammetry textures gain nothing from repacking |
| Multi-draw-indirect | **Opportunistic only** | Still behind an unsafe flag in Chrome |
| Bindless | **Design for it; don't build it** | §7.1 |

---

## 4. Parity strategy (1.x as oracle)

The harness is `parity/` side-by-side: a 1.x `Viewer` (WebGL) and a 2.0 `Engine` (WebGPU), driven by **one serialized camera state** and a fixed `JulianDate`, with the same assets and default settings. Parity runs use `Legacy1x` selection and WBOIT. Because 2.0 defaults to HDR, the primary image baseline is **1.x with `scene.highDynamicRange = true`** and the same tonemapper. A secondary LDR-vs-LDR run covers 1.x's out-of-the-box default.

| Level | Check | Pass criterion |
|---|---|---|
| L0 math | Ellipsoid/Transforms/Sun/projection vs 1.x; **hi/lo precision on Metal, D3D12 and Vulkan** | ≤1e-12 relative (CPU); bounded error in meters at canonical distances (GPU) |
| L1 selection (`Legacy1x`) | Selected 3D Tiles and terrain tile IDs after load settles | ≥ 99% Jaccard (target 100%) |
| L1′ selection (`Next`) | Image error vs a fully refined reference; bytes downloaded; time-to-full-detail; popping with a static camera | better than `Legacy1x` on most metrics and no worse on any |
| L2 image | NVIDIA FLIP mean / p95 vs 1.x screenshot | mean ≤ 0.05, p95 ≤ 0.2 (tune in M0) |
| L3 look-dev | Swipe slider plus flicker toggle | human sign-off |

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

**M0 — Foundations and de-risking spikes (≈3 wks)**
- Scaffold `packages/next`, the GPU layer and the frame-graph skeleton.
- **Spikes**:
  - multi-view skeleton covering all four target kinds (split, second canvas, offscreen, a `ViewLink` overview), plus the view-agnostic bundle trick
  - Slang (§3.4 checks)
  - **hi/lo precision on Metal**
  - **MSAA feature-ID sample-0 resolve**
  - Dawn indirect-validation overhead
  - `OffscreenCanvas` worker smoke test
- Reverse-Z camera; L0 parity; parity harness shell; 1.x baselines for H1–H10.
- *Exit*: a lit cube on the globe's ellipsoid in two views matches 1.x within L2. Slang, OIT and target-format decisions are recorded.

**M1 — GPU-driven glTF rendering (≈3–4 wks)**
- WorkerPool and decoders; geometry arenas with vertex pulling.
- **Final draw-record format**, designed with the globe and imagery-slice needs included.
- Material table plus `TextureHandle`; unlit and PBR, IBL spherical harmonics, sun.
- **Per-tile bundles + indirect args + draw-prep/frustum kernel.**
- Compute mips; async pipelines; feature-ID pick.
- **Zero-allocation CI gate.**
- *Exit*: Khronos sample models and a CAD glb pass L2 against 1.x `Model`.

**M2 — Unified streaming plus 3D Tiles (≈3–4 wks)**
- `TileSource`, SoA tile table, `Legacy1x` policy, RequestScheduler with ion and P3DT auth, engine-wide cache with per-view tracking, b3dm unwrap.
- First cut of the `Next` policy: skip-LOD and budget-driven refinement.
- *Exit*:
  - OSM Buildings, the CAD tileset and photogrammetry stream.
  - `Legacy1x` L1 ≥99% in two views.
  - `Next` L1′ is measured.

**M3 — Globe (≈3–4 wks)**
- Quantized-mesh terrain; horizon culling in the kernel.
- Imagery sources plus the **texture-array composite cache**.
- Height queries and clamping.
- *Exit*: the CAD tileset sits on Cesium World Terrain with ion imagery; globe `Legacy1x` L1 ≥99%.

**M4 — Visual parity (≈3 wks)**
- Sky and atmosphere LUTs, ground atmosphere and fog.
- LDR/HDR paths, FXAA.
- WBOIT for parity and MBOIT for `Next`.
- *Exit*: L2 on all canonical views, and L3 sign-off.

**M5 — Performance hardening (≈3 wks)**
- Two-phase occlusion culling (optional if targets are already met).
- HZB tile-coverage feedback into `Next`.
- Upload budgeting; the remaining `Next` stability and prediction work; benchmark CI.
- *Exit*: §5 targets met or the gap explained, including multi-view.

**M6 — Compute showcases and future-proofing (time-boxed, pick 2–3)**
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
| Risk | Mitigation |
|---|---|
| Hi/lo precision broken by compiler reassociation or fusion (Metal relaxed math) | Single compute draw-prep site; integer-assisted subtraction if needed; M0 Metal test |
| Silent no-op indirect draws without `indirect-first-instance` | Instance-step attribute fallback always compiled in |
| Integer MRT can't be MSAA-resolved | Sample-0 custom resolve in the pick pass |
| Dawn indirect-draw validation overhead | Measure in M0; keep args in bounds provably where possible |
| No VRAM budget API; OOM = device loss | Heuristic budgets, adaptive after loss, robust device-loss replay |
| Single queue, no async compute; uploads stall rendering | Per-frame upload byte/ms budget; encode compute early |
| `mapAsync` latency of 1–3 frames | Async pick/query APIs by design |
| Subgroups ≈0% on Safari/Firefox | Portable kernel paths (wait-free radix sort, workgroup reductions) |
| Render bundles invalidated by pipeline or bind-group changes | Rebuild per tile on change; limit target configurations |
| Slang WGSL backend gaps | Hand-written WGSL kernels allowed; WGSL-level ABI; WESL fallback |
| Browser coverage | Chromium first; parity suite on Safari and Firefox where available |
| Compatibility mode not supported | Stated non-goal |

### 7.3 Project risks
- **Schedule**: 5–6 months across everything here is optimistic. Droppable in this order:
  1. M6
  2. two-phase occlusion culling
  3. MBOIT (keep WBOIT)
  4. `Next` prediction and GPU feedback
  5. pixel-exact horizon-culling parity
- **Globe scope**: defaults plus terrain and imagery only.
- **Parity rabbit holes**: thresholds plus L3 sign-off.
- **Draw-record format churn**: designed in M1 with the globe's needs, so M2 and M3 don't break it.

## 8. Decisions

Recommendations already adopted from the review: core-only (no compatibility mode); camera-relative offsets computed in compute; `instance_index` plus fallback; texture-array imagery cache; sample-0 feature-ID resolve; two-phase occlusion culling or none; limited render-target configurations; 32-bit two-pass point rasterization; bindless designed for but not built.

**Decided by the plan owner (r4):**

| Decision | Choice |
|---|---|
| Shaders | Slang for materials and vertex/fragment code; hand-written WGSL allowed for compute kernels; user contract is a WGSL-level ABI. Gated by the M0 spike, with WGSL + WESL as the fallback. |
| Default look | **HDR + tonemapping by default**, LDR as a per-view option. Parity baseline is 1.x with HDR on. |
| Multi-view | All four scenarios in the PoC: split views on one canvas, multiple canvases, offscreen targets, linked views (`ViewLink`). |
| CAD data | Team-chosen CAD/BIM assets in Cesium ion; iModels can be tiled into ion. |
| Foundation | `packages/next` in this monorepo; TypeScript strict; new typed-array math module tested against 1.x. |
| Platforms | Chromium is the gate; Safari and Firefox best-effort; core WebGPU only. |
| Milestone order | 3D Tiles (M2) before globe (M3). The draw-record format is locked in M1 with the globe's needs included. |

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
