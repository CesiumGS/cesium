# Architecture

**What this holds:** The engine's architecture as planned and built: the GPU layer, engine, world and view, the render world and draws, the frame graph, compute, streaming, the globe, tile content, the public API, and the techniques considered and deferred. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

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

## GPU layer (`gpu/`)

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

## Engine / World / View: multiple viewports

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

## Render world and draws (`render/`): GPU-driven from M1

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

## Frame graph

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

## Compute shaders: where they pay off

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

## Unified streaming and tile selection (`streaming/`)

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

## Globe, terrain and imagery (`globe/`)

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

## Tile content

- glTF/GLB with `EXT_mesh_features`, `EXT_structural_metadata`, `KHR_texture_basisu` (transcode target chosen per device tier), meshopt and Draco.
- **b3dm unwrap** (glb + batch table → feature IDs).
- i3dm, pnts and implicit tiling are stretch goals; pnts arrives with M6 point clouds.

## Public API (intentionally breaking)

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
- **Shader extension through a versioned WGSL-level ABI**, with Slang as the first-class authoring language. _Superseded (2026-11-13): through Cesium IR, with any front-end language; see §13.42._
- **UI and widgets live outside core.** Camera controllers are separate, replaceable modules.

## Techniques considered and deferred

| Technique                              | Verdict                                                                   | Why                                                                                                                                                                                                                                         |
| -------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibility buffer / deferred texturing | **No** for the PoC; revisit when bindless ships                           | The material pass needs access to every visible tile's texture, which bindful WebGPU forbids. It also fights MSAA. Overdraw is modest with front-to-back sorting.                                                                           |
| Meshlets / Nanite-style cluster DAG    | **No** cluster hierarchies in the engine                                  | 3D Tiles HLOD already provides streaming and LOD units. A cluster DAG is a tile-format question, not a renderer one. We take sub-tile draw records and GPU feedback from Nanite instead, and keep the draw-record format producer-agnostic. |
| Virtual texturing                      | **No** for 3D Tiles; the imagery array cache is a tile-aligned form of it | Per-tile photogrammetry textures gain nothing from repacking                                                                                                                                                                                |
| Multi-draw-indirect                    | **Opportunistic only**                                                    | Still behind an unsafe flag in Chrome                                                                                                                                                                                                       |
| Bindless                               | **Design for it; don't build it**                                         | §7.1                                                                                                                                                                                                                                        |
