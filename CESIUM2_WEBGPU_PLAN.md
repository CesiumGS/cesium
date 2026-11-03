# CesiumJS 2.0 on WebGPU — Proof-of-Concept Plan

Branch: `cesium-2.0-webgpu-poc` (off `main` @ `587f52f1eb`, CesiumJS 1.146.0)

## Revisions

| Rev | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| r1  | First draft: clean-slate WebGPU engine, 1.x used as the parity oracle                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| r2  | Added multiple viewports, Slang shaders, compute-shader uses, and globe/terrain/imagery to the PoC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| r3  | Tile selection made pluggable (`Stepwise` vs improved `Next`). Folded in an external review against current industry practice, research and WebGPU status (late 2026). Main changes: GPU-driven submission from M1, no bindless in the PoC, Slang scope narrowed, a texture-array imagery cache, corrected MSAA/feature-ID and OIT plans, and new M0 precision tests. Sources are in §9.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| r4  | Plan-owner decisions recorded (§8): Slang + WGSL ABI; **HDR + tonemapping by default**; all four multi-view scenarios including **linked views**; `packages/next` in TypeScript with new math; Chromium-first, core WebGPU only; 3D Tiles before globe. Canonical CAD test data to come from team-chosen ion assets.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| r5  | M0 findings: multisampled `r32uint` is invalid in WebGPU, so feature IDs use `rg16uint` (lo16, hi16). On dual-GPU Windows laptops Chromium ignores `powerPreference` and follows the per-app Windows graphics setting, so benchmarks must record the adapter and launch Chromium on the discrete GPU.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| r6  | M0 spike results recorded in §10: L2 parity harness, GPU precision, engine-in-worker, indirect-draw overhead. Indirect draws cost measurable GPU time on Intel/D3D12, so §3.3 submission now batches before going indirect.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| r7  | Spikes rerun on the NVIDIA GPU; Slang spike run (passes, perf gate deferred to unquantized timing in M1). §10 rewritten with both GPUs.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| r8  | M0 close-out: automated runner (headless Edge, unquantized timestamps), FLIP validated against NVIDIA's reference and integrated, 1.x performance baselines, Metal deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| r9  | M1 increment 1: worker glTF pipeline, draw records v1, materials and textures, batching. Decisions: exact sRGB over matching 1.x's gamma 2.2; translucency designed clean-slate and tested against an exact reference instead of 1.x's WBOIT.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| r10 | Translucency becomes a unified compute compositor shared by translucent meshes and Gaussian splats; MBOIT is the overflow fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r11 | M1 increment 2: PBR + compute-built IBL, normal maps, lit parity vs 1.x, Slang re-ported to v1 records with a surface-material interface; Slang performance gate passes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| r12 | M1 increment 3: Draco and KTX2/Basis decoding in the workers; all 14 opaque Khronos samples within 0.025 mean FLIP of 1.x in every lighting mode.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| r13 | M1 increment 4: steady-state allocation gate (engine ~1.5 KB/frame, independent of draw count, down from ~45 KB) and first-frame cost (2.0 first frame 23–34 ms vs 1.x 203–691 ms).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r14 | M1 increment 5: CAD content. Per-vertex feature IDs (EXT_mesh_features, b3dm _BATCHID) with property/batch tables and picking, b3dm, line primitives, ion asset auth, tileset parity page. An iModel-derived CAD tileset matches 1.x apart from translucency (M4). M1 exit met.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| r15 | Demo viewer (`/viewer/`). M2 started: freeing placed models, per-view record view masks, and the `Stepwise` selection spec extracted from the 1.x base traversal (§12).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| r16 | M2 increment 1: streamed 3D Tiles with `Stepwise` selection per view over one shared cache. L1 selection parity 100% on 36 view comparisons (9 public tilesets and 3 iModel-derived CAD tilesets, 3–4 simultaneous views each). Viewer streams.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| r17 | M2 increment 2: OSM Buildings streams with 100% selection parity (Philadelphia, Manhattan); batch-table hierarchy; resize robustness (frame ordering, bounded render-target memory); viewer split view, memory panel and collapsible sections.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| r18 | M2 increment 3: photogrammetry. Google Photorealistic 3D Tiles stream via ion with required credits; L1 selection parity 100% in four simultaneous views (22–164 tiles), after fixing a traversal-visibility bug in the port. Memory-adjusted SSE. Memory management recorded as an open design question.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| r19 | M2 increment 4: `Next` policy v1 (skip-LOD with bounded skipping, visible-only coverage, cache reuse, region-grouped requests) and the L1′ harness. On Google 3D Tiles: 53% fewer requests, 48% fewer bytes, same final image, settles 1.6× faster (2.5× with 64 requests); in-between quality lags 1.x until mixed-LOD drawing lands.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| r20 | §13: design notes for tile selection beyond `Stepwise` (mixed-LOD drawing, scheduling, budget-driven refinement, multi-view priority, quality signals) and the engine memory model.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r21 | M2 increment 5: mixed-LOD drawing for `Next`; `Next` now matches or beats 1.x on every L1′ metric on Google 3D Tiles (FLIP at 1 s 0.220 vs 0.421, half the bytes). Second 1.x selection bug documented (children-bounds culling vs refinement).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| r22 | M2 increment 6: the r21 depth offset is replaced (hold, prefetch band, mixed LOD clipped to missing children only where children partition their parent); `Next` never hides a tileset that lacks a top-level geometric error; iTwin mesh exports load directly; content pipeline diagnostics; throttled L1′ with time-averaged FLIP (1.x looks better while loading on slow links); §13.8 render on demand; §14 follow-ups.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| r23 | Adaptive request windows per origin (BBR-style, protocol-seeded, cancellation); on-demand rendering per view, including views sharing a canvas (composited); viewer content tabs, combo boxes and ion token precedence; OS and networking lessons (§13.2, §13.6); M2 exit met, close-out (scheduler, `TileSource`, engine-wide cache) before M3, and a Next v2 milestone after M3. The `Next` policy is renamed `Budgeted` (`policy: "budgeted"`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| r24 | M3 increment 2: the 1.x globe selection (`GlobeStepwiseSelection`) with fog, horizon culling and 1.x's kicking and load queues; globe L1 parity 100% on six cameras with and without fog. Quadrants without data are upsampled as in 1.x (drawn clipped from the tile with data); partial availability no longer leaves holes under `Budgeted`. Tilesets stay active after loads without content. Fetch timeouts and retries recorded as a follow-up.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| r25 | Horizon culling moves into selection (float64, 1.x per-tile shrink): `Budgeted` culls 3D Tiles and terrain at the horizon before fetching, and the GPU test is retired (records back to 192 bytes). `Budgeted` refines empty tiles by SSE as 1.x does: OSM at Rainier drops from 783 requests to 31. §13.2 records cross-tileset scheduling to try (per-origin priority queue, I/O priority classes, preempting prefetch, wire priorities, aging).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| r26 | M3 increment 4: globe imagery composited on the GPU into a `texture_2d_array` cache (Bing via ion, 1.x level choice, ancestor fallback, empty-tile fallback, credits), within FLIP 0.03-0.05 of 1.x; a streamed ellipsoid globe (1.x `EllipsoidTerrainProvider`) replaces the static globe and ground patch; a 1.x-style globe camera controller with `View.pickPosition`; unlit color is display-referred (its own target, never tonemapped), which fixed darkened imagery and Google tiles.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| r27 | Content comes and goes in one world without stalls: the viewer keeps one world and globe (switch to a glTF: 26 ms, was 932), endpoint caches, an adaptive engine-wide upload budget and spread eviction. Open: frame stalls on first visits to uncached areas, and the budget's cost to settle time.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| r28 | Scene foundations (§13.9): a per-world transform table (float64 hierarchy, visibility), records 192 → 128 bytes, GPU instancing culled per instance (`EXT_mesh_gpu_instancing`), glTF assets shared across placements, generational handles, scatter uploads; the prep kernel is renamed cull. glTF 2.1 / 3D Tiles 2.0, vector billboards and decals, and ray queries to path tracing designed (§13.9, §13.10). Parity unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| r29 | M3 increment 5: height queries and clamping. `heightReference` on models (clamp/relative to ground, terrain or 3D Tiles), event-driven re-clamping, terrain clamped to its drawn surface (within 0.1 mm of 1.x `Globe.getHeight` where 1.x keeps full precision), 3D Tiles heights by GPU ray casts (`World.castRays`) within 6 mm of what 1.x renders; tileset `enableCollision` and `modelMatrix`. Custom shading becomes a PoC milestone (§3.4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r30 | Benchmark suite designed (§16): datasets, scenes and scenarios in manifests (public in the repo, private outside it, aliased in results), a checksummed local content store, engine adapters for 1.x and 2.0, a catalog of classic Cesium content, large public data and scenes where 2.0 should win; milestone "Benchmark suite v1" after M3. Clamping open items listed under M3.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r31 | M3 complete (increment 6): model instancing (`ModelOptions.instances`) with a 100,000-instance benchmark, i3dm within FLIP 0.018 of 1.x, runtime tileset `modelMatrix`, `sampleHeightMostDetailed` within 7.5 mm of 1.x, the viewer's city clamped. Real-time tracks designed (§13.11) with a milestone after Custom shading; automatic per-instance LOD noted as an idea.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| r32 | Benchmark suite v1 built (§16): public and private catalogs with license review, released 1.x builds pinned by version and release sweeps, recorded and controlled hardware conditions, redesigned reports and experiment tracking. §16.9 designs analysis and experience from analogous systems (experimentation platforms, quality-control charts, F1 telemetry, WebPageTest, frame analysis tools, 3DMark validation) for deciding, detecting, diagnosing, trusting, exploring and communicating.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| r33 | Dyno phase 1 (§16.9): validity verdicts, scorecards with declared primary and guardrail metrics, a `benchstat`-style compare, cost along the camera path with path segments and a path map, filmstrips with FLIP, request waterfalls, percentile curves and stutter metrics; uncapped (vsync off) scenarios; thermal limits and headroom recorded; condition flags limited to true conditions; the Explorer tab (camera path, free flight, linked cameras, paused streaming via `Tileset3D.freezeSelection`), with benchmark authoring planned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| r34 | Dyno rebuilt as a React app on TanStack Router (typed URL state, code-split views) with Radix Themes controls and a guided first run. Explorer inspection: bounding volumes in both engines, tiles tinted by depth or engine, the selection compared by depth (`Budgeted` draws much coarser terrain than 1.x at Rainier). Inspector designed; CI image job and bisection deferred.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| r35 | Dyno on StrataKit (Bentley's design system: MUI themed by @stratakit/mui) at the dev server's root: navigation by job (results, scenes, workbench), a new Overview, a design, copy and IA pass (bench/suite/DESIGN.md), feedback for the StrataKit team (STRATAKIT_FEEDBACK.md). Parity checks, microbenchmarks and spikes fold into Dyno's Lab.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| r36 | Engine names: releases by version (1.146.0), engines from the working tree named by branch (2.0@cesium-2.0-webgpu-poc), engines built at any git ref (2.0@main, 1.x@v1.140), settings after + (2.0+stepwise); `--engines` replaces `--configs`/`--cesium`; budgets name setups. Explorer draws 1.x's globe tile volumes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| r37 | `Budgeted` on terrain: the globe's SSE (fog only while drawn) instead of 3D Tiles' dynamic SSE, which left oblique terrain far too coarse (Rainier settled: 68 tiles vs 1.x's 67, all shared; was 20 at levels 0 to 12). The bare ellipsoid never hides content (§8 product choices, new). The inspector built (widgets/, with credits as 1.x shows them and imagery credited per tile drawn); `Viewer`, 2.0's `Cesium.Viewer`; Dyno's Viewer page (one engine at a time, StrataKit's app layout) replaces the standalone viewer. The `Legacy1x` policy is renamed `Stepwise` (`policy: "stepwise"`), for what it does: 1.x's refinement one level at a time, each level loaded on the way down.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| r38 | Overnight toward the L1′ exit check: FLIP on the GPU (40 to 60× faster); the exit check as a content × link matrix (`bench/lod-matrix.mjs`; FLIP against the target as well as SSE 2, bytes downloaded, repetitions and their standard error); prefetch only ahead of steady motion and after everything visible; loading in motion by benefit (on-screen speed as vectors); imagery request stats and cancellation; partial resident cover and a bounded hold for design models; no free detail from the cache by default (still views no longer depend on where the camera was; Google quality in motion 0.046 → 0.020, 1.x 0.026); startup endpoints during device creation; Dyno's guardrails by comparison type, bytes split at the motion, quality in motion as a guardrail; tile volumes compacted and content URIs kept relative (NYC heap 217 → 200 MB); upload budgets by time and geometry and KTX2 uploads through mapped staging buffers (NYC vsync-off hitches 4.5 → 0); content origins without URL parses; the ellipsoid's expansion within a time budget (BIM and NYC first content 0.3 to 0.6 s sooner). Full catalog against 1.x: settle −26%, CPU −73%, no guardrail broken after the fixes. Exit check: 9 of 10 cells pass (8 better); AEC trails by about 0.004, at the margin. |
| r39 | Terrain's first content ahead of 1.x: the globe's tiles load while its imagery resolves (none drawn without it), imagery is requested for tiles still loading, content workers start with the engine; first content 0.5 to 1.1 s sooner, ahead of 1.146.0 in 5 of 6 scene runs. A fixed 0.1 m near plane (reverse-Z with an infinite far plane loses nothing to it), and the underlay's depth scale 2⁻⁶⁴ so picks from beyond 13,400 km no longer read as the underlay. `GlobeController` as 1.x's: the camera never rolls, zoom keeps heading and pitch and the point under the cursor, zoom over the sky heads for the ground below, height capped at 100,000 km. Tiles build their bounding volumes on first use (Tokyo's JS heap 242 → 83 MB; 6,941 of 137,637 tiles ever build one). Memory measured over CDP after full collections, main thread and workers, as JS heap and buffers apart: 2.0 holds a third to a sixth of 1.x's JS heap but 4 to 5 times its buffers. Benchmarks run the working tree frozen as a commit and built for production, so development continues during a run (the dev server had added 5.6 MB of JS and 19 MB of buffers to NYC).                                                                                                                                 |

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

Progress (r43): **the Moon**. `moonPosition(time)` (time/moon.ts) ports
1.x's Simon et al. (1994) lunar theory (within 0.04° and 0.05% of
distance of Meeus's example 47.a), turned to Earth-fixed axes with
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

### Real-time tracks (after Custom shading)

- §13.11: track collections as instance data with a bulk update API,
  GPU clamping, interpolation between feed samples, billboard symbology
  with custom shading, labels with decluttering, picking per track.
- _Exit_: 100,000 clamped tracks updated at 10 Hz from a synthetic feed
  over terrain and 3D Tiles hold frame rate with flat CPU cost, measured
  against 1.x entities in the benchmark suite.

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
  streaming, and move to TLSF or size classes if it fragments.
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

**Designed for, built later.**

- _Quantized vertex storage on the GPU:_ positions as 16-bit values in
  the mesh bounds, octahedral normals, 16-bit UVs, decoded in the vertex
  shader (vertex pulling makes mixed formats free); about 2-3× less arena
  memory.
- _Arena pages:_ one vertex buffer runs into the device's largest storage
  binding (the viewer caps the arena at a quarter of it; mobile allows
  far less). The arena becomes several pages, with occasional compaction.
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
