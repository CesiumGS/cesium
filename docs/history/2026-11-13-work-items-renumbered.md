# Work items renumbered (2026-11-13)

**What this holds:** the table from the old milestone names to the work items' `CS-<n>` IDs, made when work tracking moved into `packages/next/work/` on 2026-11-13. It is history, kept so that commit messages, session notes and prompts written before then stay readable. It is not an alias list: no tool accepts an old name, and with the tracker's test fixtures it is one of the two files the stale-name check (`scripts/work/views.mjs check`) leaves alone.

Where an old milestone had a partial dependency, it was split in two, and both halves are listed. Items that had no old name (decisions, external items, the transform graph's open tasks, new splits of contingent work) aren't listed.

## Milestone names

| Old name | New ID | Title | Project |
| --- | --- | --- | --- |
| Profiles M1 | CS-20 | Facts and personas | Engine profiles |
| Profiles M2 | CS-21 | The catalog, rules and resolver | Engine profiles |
| Profiles M3 | CS-22 | Paths in one place, with the seam test | Engine profiles |
| Profiles M4 | CS-23 | Wired into `Engine` and `View` (`view.support`, `view.effective`, `view.explain`, notices, `strict`) | Engine profiles |
| Profiles M4a | CS-24 | `resolution` and `msaa` as features | Engine profiles |
| Profiles M4b | CS-25 | Aerial perspective steps | Engine profiles |
| Profiles M4c | CS-26 | The opt-in resolution governor | Engine profiles |
| Profiles M5 | CS-27 | The inspector's Profile section and emulation | Engine profiles |
| Profiles M6 | CS-28 | The `@cesium/next/gpu` entry point | Engine profiles |
| Profiles M7 | CS-29 | The Viewer's defaults migrated | Engine profiles |
| Profiles M8 | CS-30 | The WebGL 2 renderer's facts and support rules | Engine profiles |
| Profiles M9 | CS-31 | The worker mode's snapshots | Engine profiles |
| W0 | CS-32 | The shader route spike: our own naga crate measured against the published one; Slang → WGSL → naga → GLSL ES for engine entry points | The WebGL 2 renderer |
| W1 | CS-33 | The seam extracted, WebGPU only (`WorldDraws`, `RenderDevice`, `WorldMirror`, `ViewRenderer`), as pure moves | The WebGL 2 renderer |
| W2 | CS-34 | Renderer-neutral content resources (texture sources, `MeshData`, `ImageryCompositor`) | The WebGL 2 renderer |
| W3 | CS-35 | The probe, the `renderer` option and an empty WebGL 2 device | The WebGL 2 renderer |
| W4 | CS-36 | First draws, unlit (glTF and 3D Tiles meshes) | The WebGL 2 renderer |
| W5 | CS-37 | The globe, terrain and imagery | The WebGL 2 renderer |
| W6 | CS-38 | Lighting and instancing | The WebGL 2 renderer |
| W7 | CS-39 | Styles and warps through Cesium IR | The WebGL 2 renderer |
| W8 | CS-40 | Picks and outputs | The WebGL 2 renderer |
| W8 (user code) | CS-41 | User code on the WebGL 2 renderer | The WebGL 2 renderer |
| W9 | CS-42 | The atmosphere | The WebGL 2 renderer |
| R1 (WebGL 2) | CS-43 | Research: which browsers lack WebGPU, by share and platform, and which WebGL 2 extensions they have | The WebGL 2 renderer |
| W10 | CS-44 | Further steps, in the browser research's order (FXAA, clips, the depth-range readback, shadows, ambient occlusion, `moments16`, `moments32`) | The WebGL 2 renderer |
| W11 | CS-45 | The runner suite, the gallery's renderer switch, the handbook | The WebGL 2 renderer |
| IR-1 | CS-48 | The core (types, rates, equations, literal slots, the builder) | Cesium IR |
| IR-2 | CS-49 | The versioned JSON format | Cesium IR |
| IR-3 | CS-50 | The passes (float64 evaluator, autodiff, intervals with breakpoint splitting, rates, literals to uniforms) | Cesium IR |
| IR-4 | CS-51 | The WGSL emitter | Cesium IR |
| IR-5 | CS-52 | The GLSL ES 3.00 emitter | Cesium IR |
| IR-6 | CS-53 | Transforms move onto Cesium IR, as pure moves | Cesium IR |
| IR-7 | CS-54 | Routes on both emitters, with the residual and df64 forms | Cesium IR |
| IR-8 | CS-55 | Styles move onto Cesium IR, literals as uniforms | Cesium IR |
| IR-9 | CS-56 | Tables and the bounded search, the first extensions, with the residual's row window | Cesium IR |
| IR-10 | CS-57 | Our naga crate (Rust in development and CI only) | Cesium IR |
| IR-11 | CS-58 | The WGSL front end, through naga and SPIR-V, with diagnostics | Cesium IR |
| IR-12 | CS-59 | The writer and reader for `KHR_interactivity`'s graph JSON (vendor extension `BENTLEY_interactivity_ir`) | Cesium IR |
| IR-12 (tables) | CS-60 | Tables in the `KHR_interactivity` graph JSON | Cesium IR |
| IR-13 | CS-61 | The API surface (a program is the normative input; languages as entry points loaded on demand; `CustomShader` hooks take programs or WGSL functions) | Cesium IR |
| IR-14 | CS-62 | The inspector and debugging | Cesium IR |
| IR-15 | CS-63 | The MaterialX front end, including the lowering the MaterialX plan's task 9 had (no pre-IR emitter) | Cesium IR |
| IR-G4 | CS-64 | Noise, first among the gaps | Cesium IR |
| IR-G1 | CS-65 | Textures and samplers | Cesium IR |
| IR-G2 | CS-66 | Matrices | Cesium IR |
| IR-G3 | CS-67 | Screen-space derivatives | Cesium IR |
| IR-G5 | CS-68 | General bounded loops | Cesium IR |
| IR-G6 | CS-69 | Structs | Cesium IR |
| MX-1 | CS-70 | The document layer (reader, writer, generated definitions, flattening; assets through `npm run setup`) | Live MaterialX graph editing |
| MX-2b | CS-71 | `setShader(…, { swap: "whenReady" })` on models, so the last good material stays on screen | Live MaterialX graph editing |
| MX-5a | CS-72 | `Tileset3D.setShader` | Live MaterialX graph editing |
| MX-5b | CS-73 | The globe surface's fragment hook (height, slope, aspect, water, latitude, camera distance) | Live MaterialX graph editing |
| MX-5c | CS-74 | The quantized-mesh water mask | Live MaterialX graph editing |
| MX-6 | CS-75 | OpenPBR tier 1 in the engine material, starting with emission in nits; lobes registered as profile features | Live MaterialX graph editing |
| MX-7 | CS-76 | OpenPBR tier 2 (fuzz, anisotropy, tangents) | Live MaterialX graph editing |
| MX-8 | CS-77 | glTF `KHR_materials_*` onto the same material | Live MaterialX graph editing |
| MX-8 (sheen and anisotropy) | CS-78 | glTF sheen and anisotropy onto the tier 2 lobes | Live MaterialX graph editing |
| MX-2 | CS-79 | Presets with live parameters on the stage | Live MaterialX graph editing |
| MX-3 | CS-80 | The node editor (React Flow) and rewiring, with compiles as cancelable jobs | Live MaterialX graph editing |
| MX-4 | CS-81 | Thumbnails (a cancelable job on Cesium IR's evaluator) and picks | Live MaterialX graph editing |
| MX-5d | CS-82 | The city and terrain places | Live MaterialX graph editing |
| MX-5d (night windows and zinc roofs) | CS-83 | Night windows and zinc roofs in the city places | Live MaterialX graph editing |
| MX-10 | CS-84 | The WebGL 2 renderer's path | Live MaterialX graph editing |
| MX-11 | CS-85 | The comparison against MaterialX's own renderer | Live MaterialX graph editing |
| JP-1 | CS-87 | Content decode with priorities and cancellation, onto `Jobs` | The job system's ports |
| JP-2 | CS-88 | One-off engine loads onto `Jobs` | The job system's ports |
| JP-3 | CS-89 | Dedicated worker groups onto `Jobs` | The job system's ports |
| JP-4 | CS-90 | The horizon occluder's walk onto the apply phase's slices | The job system's ports |
| JP-5 | CS-91 | Warp fits onto the apply phase's slices | The job system's ports |
| JP-6 | CS-92 | B-rep sections' main-thread steps onto the apply phase's slices | The job system's ports |
| JP-7 | CS-93 | The public slicers onto the apply phase's slices | The job system's ports |
| JP-8 | CS-94 | The refit fallback's own budget | The job system's ports |
| the inspector's Jobs section | CS-95 | The inspector's Jobs section | The job system's ports |
| JP-9 | CS-98 | Tile selection off the main thread | The job system's ports |
| app jobs | CS-100 | App jobs (`engine.jobs.run`) | The job system's ports |
| WF-1 | CS-101 | The protocol table: every public member classified, checked against `api/surface.txt` | The worker-mode façade |
| Plan 5i | CS-102 | The public API review, with the protocol table and the façade's constraints | The worker-mode façade |
| WF-2a | CS-103 | Reads reshaped, on the main thread | The worker-mode façade |
| WF-2b | CS-104 | Writes reshaped, on the main thread | The worker-mode façade |
| WF-2c | CS-105 | Functions reshaped, on the main thread | The worker-mode façade |
| WF-2c (program forms) | CS-106 | Functions as Cesium IR programs; closures refused | The worker-mode façade |
| WF-2d | CS-107 | Internals out of the main entry | The worker-mode façade |
| WF-3 | CS-108 | The façade and the direct transport | The worker-mode façade |
| WF-4 | CS-109 | The channel transport, and the API suite in both modes | The worker-mode façade |
| WF-5 | CS-110 | The worker backend (canvas transfer, resize, input, built-in controllers) | The worker-mode façade |
| WF-6 | CS-111 | The probe and `thread: "auto"` | The worker-mode façade |
| WF-7 | CS-112 | Errors and loss, `restart()` | The worker-mode façade |
| WF-7b | CS-113 | The opt-in scene rebuild on loss | The worker-mode façade |
| WF-8 | CS-114 | Modules in the engine's thread, on the main thread | The worker-mode façade |
| WF-8 (worker) | CS-115 | Modules in the engine's thread, in the worker | The worker-mode façade |
| WF-9 | CS-116 | Widgets, the inspector, the recorder, `__cesium` | The worker-mode façade |
| WF-11 | CS-117 | Measurements and the default | The worker-mode façade |
| WF-10 | CS-119 | A shared snapshot | The worker-mode façade |
| WF-12 | CS-120 | The other plans plug in | The worker-mode façade |
| LT-1 | CS-121 | The signed `transition` word, the dither flag, `View.lodTransitions: "smooth" \| "pop"`, the clock's epoch rebase | Level-of-detail transitions |
| LT-2 | CS-122 | The leaving set, terrain morph-back for the common case, skip rules, chaining, the memory rule, `stats.transitions` | Level-of-detail transitions |
| LT-3 | CS-123 | Imagery coarsening, including the two suspected slice bugs (shown by tests first) | Level-of-detail transitions |
| LT-4 | CS-124 | Retargeting as a `Jobs` job, and the dither fallback for terrain without morph data | Level-of-detail transitions |
| LT-5 | CS-125 | The dither in every pass; picks and height queries see the destination | Level-of-detail transitions |
| LT-6 | CS-126 | 3D Tiles transitions (REPLACE both ways with mixed-LOD boxes, ADD in and out) | Level-of-detail transitions |
| LT-7 (script) | CS-127 | The frame-jump script (`scripts/frameJumps.mjs`, reading recorder dumps) | Level-of-detail transitions |
| LT-7 | CS-128 | Measure the transitions: the protocols and the report | Level-of-detail transitions |
| LT-8 | CS-133 | Distance-driven morph factors for terrain | Level-of-detail transitions |
| R1 (refinement) | CS-134 | The source registry and snapshot, with adapters and a check against today's `needsTicks`; no behavior change | Refinement and convergence |
| R2 | CS-135 | Public reads (`view.refinement`, `onRefinement`, `stats.loop`) | Refinement and convergence |
| R3 | CS-136 | `converged()`, replacing `whenReady` | Refinement and convergence |
| R4 | CS-137 | `freeze` (a per-view selection hold; suspends the governor) | Refinement and convergence |
| R5 | CS-138 | The loop switch (`wake(kind)`, `FrameStats.why`) | Refinement and convergence |
| R6 | CS-139 | The inspector's refinement table, flags and converge times | Refinement and convergence |
| R7 | CS-140 | Holds and the jobs hook (`JobSpec.refinement`, `SliceSpec.refinement`) | Refinement and convergence |
| R8 | CS-141 | The examples' indicator | Refinement and convergence |
| R9 | CS-142 | Migrate the waits (bench, parity, scripts, examples, widgets, spikes) | Refinement and convergence |
| R10 | CS-143 | The handbook page "Loading is refinement" | Refinement and convergence |
| SR-1 | CS-144 | The fault-injection harness | Streaming robustness |
| SR-2 | CS-145 | The fetch layer (three timers, structured failures, `isCancel`) | Streaming robustness |
| SR-3 | CS-146 | Origin health (latency samples, derived timeouts, the retry bucket, throttling, `Retry-After` pauses) | Streaming robustness |
| SR-4 | CS-147 | Retries for 3D Tiles content (episodes owned by the tile) | Streaming robustness |
| SR-5 | CS-148 | Missing content and recovery (the parent stays, cool-downs, `retryFailed()`) | Streaming robustness |
| SR-6 | CS-149 | The globe (terrain upsampled on 404, imagery recovery) | Streaming robustness |
| SR-7 | CS-150 | ion tokens | Streaming robustness |
| SR-8 | CS-151 | Online, hidden and offline | Streaming robustness |
| SR-9 | CS-152 | The inspector's Network section and the recorder | Streaming robustness |
| SR-10 | CS-153 | The refinement entries | Streaming robustness |
| SR-11 | CS-154 | The headless fault check and the zero-fault parity guard | Streaming robustness |
| SR-12 | CS-155 | Handbook and plan updates | Streaming robustness |
| SR-13 | CS-156 | Request options at 1.x parity: proxies, inherited query parameters and headers, credentials for trusted origins | Streaming robustness |
| SR-13 (auth-refresh hook) | CS-157 | The app's auth-refresh hook | Streaming robustness |
| transform graph task 10 | CS-159 | Per-view routes without twins | The transform graph |
| transform graph task 11 | CS-160 | The camera branch: eye steps | The transform graph |
| transform graph task 12, fix 3 | CS-161 | Center constants on the GPU for every draw | The transform graph |
| transform graph task 12, fix 5 | CS-162 | A non-blocking fit fallback | The transform graph |
| transform graph task 12, fix 4 | CS-163 | No compile before first draw: the interpreter pipeline | The transform graph |
| transform graph fix 8 | CS-164 | Level of detail through a warp: the remaining increments | The transform graph |
| transform graph task 9 (per-family fixes) | CS-168 | The per-family warp fixes: flatten, corridor, bend, the TM Jacobian | The transform graph |

The old milestone groups M8 to M13 each became one project: M8 CS-12 (the job system's ports), M9 CS-14 (level-of-detail transitions), M10 CS-11 (live MaterialX graph editing), M11 CS-15 (refinement and convergence), M12 CS-16 (streaming robustness), M13 CS-13 (the worker-mode façade). M7 became three: CS-8 (engine profiles), CS-10 (Cesium IR) and CS-9 (the WebGL 2 renderer).

## Section numbers

The overall plan's numbered sections, and where their text went on 2026-11-13. Unnumbered sections went with the numbered section above them, except where listed in the overview's index.

| Old section | Now |
| --- | --- |
| 2 | `docs/design/why-1x-is-slow.md` |
| 3 | `docs/design/architecture.md` |
| 3.1 | `docs/design/architecture.md` |
| 3.2 | `docs/design/architecture.md` |
| 3.3 | `docs/design/architecture.md` |
| 3.4 | `docs/design/shaders.md` |
| 3.5 | `docs/design/architecture.md` |
| 3.6 | `docs/design/architecture.md` |
| 3.7 | `docs/design/architecture.md` |
| 3.8 | `docs/design/architecture.md` |
| 3.9 | `docs/design/architecture.md` |
| 3.10 | `docs/design/architecture.md` |
| 3.11 | `docs/design/architecture.md` |
| 4 | `docs/design/parity.md` |
| 4.1 | `docs/design/parity.md` |
| 4.2 | `docs/design/lighting-and-shading.md` |
| 5 | `docs/design/performance-methodology.md` |
| 6 | `docs/history/milestones-m0-to-m3.md` |
| 7 | `docs/design/risks.md` |
| 7.1 | `docs/design/risks.md` |
| 7.2 | `docs/design/risks.md` |
| 7.3 | `docs/design/risks.md` |
| 8 | `docs/decisions/r4-owner-decisions.md` |
| 9 | `docs/history/r3-review-sources.md` |
| 10 | `docs/history/m0-spike-results.md` |
| 11 | `docs/history/m1-progress.md` |
| 12 | `docs/history/m2-progress.md` |
| 13 | `docs/design/tile-selection-and-memory.md` |
| 13.1 | `docs/design/tile-selection-and-memory.md` |
| 13.2 | `docs/design/tile-selection-and-memory.md` |
| 13.3 | `docs/design/tile-selection-and-memory.md` |
| 13.4 | `docs/design/tile-selection-and-memory.md` |
| 13.5 | `docs/design/tile-selection-and-memory.md` |
| 13.6 | `docs/design/tile-selection-and-memory.md` |
| 13.7 | `docs/design/tile-selection-and-memory.md` |
| 13.8 | `docs/design/rendering-on-demand.md` |
| 13.9 | `docs/design/transforms-and-instancing.md` |
| 13.10 | `docs/design/ray-queries-and-path-tracing.md` |
| 13.11 | `docs/design/real-time-tracks.md` |
| 13.12 | `docs/design/examples-and-the-gallery.md` |
| 13.13 | `docs/design/time-and-its-controls.md` |
| 13.14 | `docs/design/bodies-frames-and-engineering-coordinates.md` |
| 13.15 | `docs/design/gpu-limits-and-capacities.md` |
| 13.16 | `docs/design/ray-queries-where-they-run.md` |
| 13.17 | `docs/design/layers-engine-renderer-backend.md` |
| 13.18 | `docs/design/color-in-the-styling-language.md` |
| 13.19 | `docs/design/semantic-metadata-and-picking.md` |
| 13.20 | `docs/design/editing.md` |
| 13.21 | `docs/design/ion-as-a-module.md` |
| 13.22 | `docs/design/custom-post-processing.md` |
| 13.23 | `docs/design/indirect-draws-on-intel.md` |
| 13.24 | `docs/design/reference-data.md` |
| 13.25 | `docs/design/scene-items.md` |
| 13.26 | `docs/design/geometry-through-placement-review.md` |
| 13.27 | `docs/design/cad-display-extensions.md` |
| 13.28 | `docs/design/water-and-sun-glare.md` |
| 13.29 | `docs/decisions/2026-11-08-owners-calls-for-later-plans.md` |
| 13.30 | `docs/design/sun-and-sky-example.md` |
| 13.31 | `docs/design/orbits-example.md` |
| 13.32 | `docs/design/sky-light-and-points-unifications.md` |
| 13.33 | `docs/design/breps-and-geometry-queries.md` |
| 13.34 | `docs/design/infrastructure-and-geoscience-capabilities.md` |
| 13.35 | `docs/design/black-hole-visualization.md` |
| 13.36 | `docs/design/modular-renderer.md` |
| 13.37 | `docs/design/transform-graph.md` |
| 13.38 | `docs/design/styling-and-a-shared-ir.md` |
| 13.39 | `docs/design/lidar-example.md` |
| 13.40 | `docs/design/styling-language.md` |
| 13.41 | `docs/design/investigations-2026-11-13.md` |
| 13.42 | `docs/design/core-ir.md` |
| 13.43 | `docs/design/job-system.md` |
| 14 | `packages/next/work/` (items and the work README) |
| 15 | `docs/history/m3-progress.md` |
| 16 | `docs/design/benchmark-suite.md` |
| 16.9 | `docs/design/benchmark-analysis-and-experience.md` |
| 16.10 | `docs/design/image-regression-in-dyno.md` |
| 6, M0 to M6 | `docs/history/` (one file per milestone, see the overview's index) |
| 6, M7 to M13 and the kickoff order | `packages/next/work/`: the items, the project files' summaries, and the work README's order section |
| 16.1 to 16.8 | `docs/design/benchmark-suite.md` |

The old follow-ups table's rows became external items: row 1 CS-174, row 2 CS-175, row 3 CS-176, row 4 CS-177, row 5 CS-178, row 6 CS-179, row 8 CS-180, row 9 CS-181, row 10 CS-182, row 11 CS-183, row 12 CS-184, row 13 CS-185, row 14 CS-186, row 15 CS-187. Row 7 was closed by CS-16.
