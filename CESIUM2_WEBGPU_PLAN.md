# CesiumJS 2.0 on WebGPU — Proof-of-Concept Plan

Branch: `cesium-2.0-webgpu-poc` (off `main` @ `587f52f1eb`, CesiumJS 1.146.0)

History is in git. Tags like "r23" in this document are old revision numbers, kept so references to them still make sense.

**What this holds:** the goal, the principles, how the project's documents are organized, and where to look. Until 2026-11-13 this file held everything in one place; that content now lives in the files indexed below, unchanged, and the work is tracked as items in [`work/`](work/README.md).

## Goal

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
- **WebGPU compatibility mode** (WebGL 2 is a second renderer, not a fallback: [the WebGL 2 plan](docs/superpowers/plans/2026-11-13-webgl2-renderer.md))
- CZML/KML/GeoJSON
- Underground and globe translucency
- Imagery draped on 3D Tiles
- Bindless textures (designed for, not built; [risks.md](docs/design/risks.md), "Bindless textures: not in the PoC, designed for in 2.0")

---

## Principles

- **1.x is the oracle, not the template.** It is the visual and behavioral reference we test against and a source of formulas and heuristics, never an architectural model (the goal above; [parity strategy](docs/design/parity.md)).
- **Mirror 1.x where users want its behavior; elsewhere do what 2.0's design implies,** keep a setting where users depend on the old behavior, and record the choice ([product choices](docs/decisions/product-choices.md)).
- **Plans by milestones and dependencies, never durations** (owner, 2026-11-13). The work items carry the order: what an item needs, and what is ready.
- **Measure before adopting.** Spikes are decision tools, and performance claims come from the benchmark suite ([performance methodology](docs/design/performance-methodology.md), [the benchmark suite](docs/design/benchmark-suite.md)).
- **Decisions are written down with their reasons and dates,** in [`docs/decisions/`](#decisions) or in the design note they belong to.

## How the documents are organized

| Where                     | What it holds                                                                                               | Changes when                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `docs/decisions/`         | Decisions with their reasons: the founding choices, product choices, the owner's calls                      | A decision is made or revisited                           |
| `docs/design/`            | Design notes, one topic per file: architecture, shading, selection, frames, the IR, the job system and more | The design changes; each note keeps its own dated entries |
| `docs/history/`           | Milestones as they were planned, progress logs, measurements and spike results                              | Rarely: history is appended, not rewritten                |
| `docs/superpowers/plans/` | Implementation plans, one per project, with milestone tables                                                | A plan is written, reviewed or amended                    |
| `work/`                   | The work items: one file per item, with projects and initiatives, and the generated lists                   | Work is claimed, finished, added or dropped               |
| `handbook/`               | The engine's document for stakeholders and the 1.x team                                                     | A plan lands or a deep dive changes                       |

## Where to look

| Question                                               | Look in                                                                                 |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| What can I work on now?                                | `npx hitld work query --ready`, and [the work lists](work/README.md)                    |
| What is waiting on the owner?                          | `npx hitld work query --kind decision --state planned`, or `work/views/decisions.md`    |
| Why was something decided?                             | [`docs/decisions/`](#decisions), then the design note on the topic                      |
| How does a part of the engine work, or how should it?  | [`docs/design/`](#design)                                                               |
| What was measured, and when?                           | [`docs/history/`](#history) for milestones and logs; `bench/results` for benchmark runs |
| How is a project built, step by step?                  | Its plan in `docs/superpowers/plans/`, named by its project file                        |
| What did an old section number or milestone name mean? | [the renumbering table](docs/history/2026-11-13-work-items-renumbered.md)               |

## Index

### Decisions

- [The plan owner's decisions (r4)](docs/decisions/r4-owner-decisions.md): The founding decisions: what the review's recommendations adopted, and the owner's table (shaders, default look, multi-view, CAD data, foundation, platforms, milestone order).
- [Product choices: where 2.0 departs from 1.x](docs/decisions/product-choices.md): Where 2.0 deliberately behaves differently from 1.x, why, and when to revisit.
- [Owner's calls for the later plans](docs/decisions/2026-11-08-owners-calls-for-later-plans.md): The owner's calls of 2026-11-08 and 2026-11-09 for the later plans: stars and sky data, deep-sky objects, planets, retiring Entity, and the follow-ups they set.
- [Architecture decisions (2026-11-13)](docs/decisions/2026-11-13-architecture-decisions.md): The owner's architecture decisions from the 2026-11-13 discussion: threading, jobs, the core IR, warps, loading as refinement, inspector rules.
- [Content sources as modules (2026-11-16)](docs/decisions/2026-11-16-content-sources-as-modules.md): The owner's call that content from many kinds of source (3D Tiles, MVT, Esri services, glTF files, USD, the globe) loads through one module seam, built now.
- [The release plan and parity with 1.x (2026-11-17)](docs/decisions/2026-11-17-release-plan-and-parity.md): The owner's calls on what 2.0 drops from 1.x, what it keeps as modules, how it's packaged, and what each release on the ladder needs, with the trust and evals track.

### Design

- [Why 1.x is slow](docs/design/why-1x-is-slow.md): The performance hypotheses about CesiumJS 1.x that 2.0 set out to verify and then beat (H1 to H10).
- [Architecture](docs/design/architecture.md): The engine's architecture as planned and built: the GPU layer, engine, world and view, the render world and draws, the frame graph, compute, streaming, the globe, tile content, the public API, and the techniques considered and deferred.
- [Shaders](docs/design/shaders.md): Slang as the one source, WGSL where it must be, and the user contract (since 2026-11-13, Cesium IR programs: see `core-ir.md`).
- [Parity strategy](docs/design/parity.md): How 2.0 is tested against 1.x as the oracle: the parity levels, the harness and extension coverage.
- [Lighting and shading](docs/design/lighting-and-shading.md): What matches 1.x and what is judged against physics: units and exposure, the atmosphere, shadows, ambient occlusion, translucency, tone mapping and their measurements.
- [Performance methodology](docs/design/performance-methodology.md): How performance is measured: targets, the main-thread and GPU timings, allocations and the rules for comparing runs.
- [Risks](docs/design/risks.md): Bindless textures, platform and WebGPU risks, and project risks.
- [Tile selection and memory beyond `Stepwise`](docs/design/tile-selection-and-memory.md): Design notes for selection and memory: mixed-LOD drawing, request scheduling, budget-driven refinement, multi-view priority, quality signals, memory management, structure and formats.
- [Rendering on demand](docs/design/rendering-on-demand.md): When the engine renders, sleeps and wakes.
- [Transforms and instancing](docs/design/transforms-and-instancing.md): Placements, per-node transforms, instancing and how they reach the GPU.
- [Ray queries, ray tracing and path tracing](docs/design/ray-queries-and-path-tracing.md): What ray queries, ray tracing and a path tracer would mean for the engine.
- [Real-time tracks: thousands of moving, clamped entities](docs/design/real-time-tracks.md): The design for track collections: instance data, GPU clamping, interpolation, symbology, labels and picks.
- [Examples and the gallery](docs/design/examples-and-the-gallery.md): How examples are built and shown: the gallery, pages without a build, and the rules examples follow.
- [Time and its controls](docs/design/time-and-its-controls.md): The engine's clock, time scales and the time controls.
- [Bodies, frames and engineering coordinates](docs/design/bodies-frames-and-engineering-coordinates.md): Reference frames, bodies, geodesy, engineering coordinates and measurement: the design behind the frames plans, with the owner's held questions.
- [GPU resource limits and capacities](docs/design/gpu-limits-and-capacities.md): Device limits, capacities and how the engine sizes and reports them.
- [Ray queries: where they run, and when acceleration structures are built](docs/design/ray-queries-where-they-run.md): Placement of ray queries on CPU and GPU, and when acceleration structures are built (owner, 2026-11-06).
- [Layers: engine, renderer and GPU backend](docs/design/layers-engine-renderer-backend.md): Notes on the layers between the engine, a renderer and the GPU backend (2026-11-08).
- [Color in the styling language](docs/design/color-in-the-styling-language.md): How color works in the styling language (owner, 2026-11-08).
- [Semantic metadata and picking](docs/design/semantic-metadata-and-picking.md): How metadata reaches the engine, labels by taxonomy, stable IDs, and what a pick means in splats, point clouds and fields (design, CS-832, 2026-11-21).
- [Editing](docs/design/editing.md): The write path back through the content seams: write capabilities, the edit layer, change sets, conflicts and the change feed (CS-831, 2026-11-21).
- [SimReady, and how USD comes in](docs/design/simready-and-usd.md): Which SimReady profile to target, OpenUSD in WebAssembly against a TypeScript subset reader against conversion, what alpha.1's seams reserve, and a recommendation for CS-802 (study, CS-833, 2026-11-21).
- [Three USD readers compared](docs/design/usd-readers.md): The subset reader, LightUSD and OpenUSD in WebAssembly measured in Dyno over six SimReady samples: size, start time, coverage of CS-802 B's features, what the host page must allow, licenses and upkeep, with the recommendation for CS-901 (CS-900, 2026-11-22).
- [Ion as a swappable module](docs/design/ion-as-a-module.md): Cesium ion behind an interface the host can replace (owner, 2026-11-08).
- [Custom post-processing](docs/design/custom-post-processing.md): For later: custom post-processing stages (owner, 2026-11-08).
- [Risk: indirect draws on Intel integrated GPUs](docs/design/indirect-draws-on-intel.md): A risk found 2026-11-08 and what was measured.
- [Reference data shipped with the engine](docs/design/reference-data.md): Which reference data the engine ships and how (owner, 2026-11-08).
- [Scene items](docs/design/scene-items.md): Scene items (owner, 2026-11-08).
- [An architectural review of geometry through placement](docs/design/geometry-through-placement-review.md): The review of geometry, placement and warps, its increments and the owner's answers.
- [CAD display extensions, with the vector design](docs/design/cad-display-extensions.md): CAD display extensions and how they meet the vector design (owner, 2026-11-08).
- [Water and sun glare](docs/design/water-and-sun-glare.md): For a later rendering plan: water and sun glare (owner, 2026-11-08).
- [Sketch: a gallery example for the sun and sky model](docs/design/sun-and-sky-example.md): A gallery example sketch for the sun and sky model (owner, 2026-11-08).
- [Sketch: an orbits example](docs/design/orbits-example.md): An orbits example sketch (owner, 2026-11-08).
- [Unifications across the sky, light and points](docs/design/sky-light-and-points-unifications.md): What the sky, light and point rendering share (owner, 2026-11-08).
- [B-reps and a geometry query interface](docs/design/breps-and-geometry-queries.md): B-reps, their render form and a geometry query interface (owner, 2026-11-09).
- [Capabilities the infrastructure and geoscience domains need](docs/design/infrastructure-and-geoscience-capabilities.md): Capabilities the infrastructure and geoscience domains need (owner, 2026-11-10).
- [Brainstorm: a black hole visualization](docs/design/black-hole-visualization.md): A brainstorm on a black hole visualization, with its open questions (owner, 2026-11-11).
- [Modularizing the renderer without sacrifices now](docs/design/modular-renderer.md): For later: how the renderer could be modularized without cost today (owner, 2026-11-11).
- [The transform graph](docs/design/transform-graph.md): The transform graph's design: nodes, routes, placement and the gallery scenes (owner, 2026-11-11). The plan is `docs/superpowers/plans/2026-11-12-transform-graph.md`.
- [Brainstorm: styling languages, JavaScript and a shared IR](docs/design/styling-and-a-shared-ir.md): Styling languages, JavaScript and a shared IR (owner, 2026-11-12).
- [Sketch: a gallery example for a vehicle's lidar over the design](docs/design/lidar-example.md): A gallery example sketch: a vehicle's lidar over the design (owner, 2026-11-12).
- [Brainstorm: a styling language of our own, on the IR](docs/design/styling-language.md): A styling language of our own on the IR, with its open questions (owner, 2026-11-12).
- [Investigations and design-review questions](docs/design/investigations-2026-11-13.md): The 2026-11-13 investigations: hybrid rendering and ray tracing, culling and rasterization, wgpu, modularization, the shader toolchain and IR, and swappable and hybrid renderers. The owner's architecture decisions from the same discussion are in `docs/decisions/2026-11-13-architecture-decisions.md`.
- [The core IR: what the middle end should be](docs/design/core-ir.md): Research and spikes behind Cesium IR, the owner's decisions and naming (2026-11-13). The plan is `docs/superpowers/plans/2026-11-13-cesium-ir.md`.
- [A job system for background work](docs/design/job-system.md): The job system's design and first slice (2026-11-13). Its ports are the job system's project in `work/`.
- [The benchmark suite](docs/design/benchmark-suite.md): The benchmark suite's design (concepts, manifests and storage, measurement and statistics, the catalog, interfaces, engines and versions, scope, later), with what v1 built and the findings it raised.
- [Benchmark analysis and experience design](docs/design/benchmark-analysis-and-experience.md): Learning from analogous systems: how the benchmark suite's analysis and experience should work.
- [Image regression in Dyno](docs/design/image-regression-in-dyno.md): Image regression checks in Dyno.
- [The 2.0 repository: layout, build, tests and releases](docs/design/repository-build-and-release.md): The repository once 1.x leaves the branch: packages at the root, the per-package build, lockfiles, tests and gates, parity on a pinned published 1.x, Sandcastle, CI, the release pipeline and CS-835's move (design, CS-610, 2026-11-21).

### History

- [Sources from the r3 review](docs/history/r3-review-sources.md): The sources the r3 review read.
- [Milestones M0 to M3](docs/history/milestones-m0-to-m3.md): The first milestones as planned: foundations and spikes, GPU-driven glTF, unified streaming and 3D Tiles, the globe. Their progress is in the progress logs beside this file.
- [Benchmark suite v1 (after M3)](docs/history/benchmark-suite-v1-milestone.md): The benchmark suite's first milestone as planned.
- [Budgeted selection: planned work (after M3)](docs/history/budgeted-selection-milestone.md): The planned and finished work on `Budgeted` selection after M3, in order (r37 onwards). Open points in it are not work items yet.
- [M4: visual parity](docs/history/m4-visual-parity.md): Milestone M4 as planned and worked through.
- [Custom shading (after M4)](docs/history/custom-shading-milestone.md): The custom shading milestone as planned and worked through. Open points in it are not work items yet.
- [Real-time tracks (after custom shading)](docs/history/real-time-tracks-milestone.md): The real-time tracks milestone as planned and worked through. Open points in it are not work items yet.
- [M5 and M6](docs/history/m5-and-m6.md): Milestones M5 (performance hardening) and M6 (compute showcases), as planned. Not started, and not work items yet.
- [M0 spike results](docs/history/m0-spike-results.md): The results of M0's de-risking spikes and the M0 close-out (r8).
- [M1 progress](docs/history/m1-progress.md): M1's increments: the glTF content path and batching, PBR and image-based lighting, Draco and KTX2, the allocation gate, CAD content.
- [M2 progress](docs/history/m2-progress.md): M2's increments: the demo viewer, `Stepwise` and `Budgeted` selection, OSM Buildings, photogrammetry, mixed-LOD drawing, and the 1.x selection bugs found.
- [M3 progress](docs/history/m3-progress.md): M3's increments: quantized-mesh terrain, globe selection, horizon culling, imagery and camera, content in and out of a live world, height queries and clamping, and the close-out.
- [Work items renumbered](docs/history/2026-11-13-work-items-renumbered.md): the table from the old milestone names and section numbers to the work items' IDs and the files above.
