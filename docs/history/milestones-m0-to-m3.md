# Milestones

**What this holds:** The first milestones as planned: foundations and spikes, GPU-driven glTF, unified streaming and 3D Tiles, the globe. Their progress is in the progress logs beside this file. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Durations are rough and **optimistic** for one engineer with AI assistance. If time runs short, the droppable items are listed under §7.

## M0 — Foundations and de-risking spikes (≈3 wks)

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

## M1 — GPU-driven glTF rendering (≈3–4 wks)

- WorkerPool and decoders; geometry arenas with vertex pulling.
- **Final draw-record format**, designed with the globe and imagery-slice needs included.
- Material table plus `TextureHandle`; unlit and PBR, IBL spherical harmonics, sun.
- **Per-tile bundles + indirect args + draw-prep/frustum kernel.**
- Compute mips; async pipelines; feature-ID pick.
- **Zero-allocation CI gate.**
- _Exit_: Khronos sample models and a CAD glb pass L2 against 1.x `Model`.

## M2 — Unified streaming plus 3D Tiles (≈3–4 wks)

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

## M3 — Globe (≈3–4 wks)

- Quantized-mesh terrain; horizon culling (in selection since r25).
- Imagery sources plus the **texture-array composite cache**.
- Height queries and clamping (r29).
- Closed out in r31 (§15, increment 6): model instancing and i3dm, the
  100,000-instance benchmark, runtime tileset `modelMatrix`, the viewer's
  city clamped, `sampleHeightMostDetailed`. Clamping billboards and labels
  moves to real-time tracks (§13.11), with the billboards themselves.
- **Status: M3 complete (r31).**
- _Exit_: the CAD tileset sits on Cesium World Terrain with ion imagery; globe `Stepwise` L1 ≥99%.
