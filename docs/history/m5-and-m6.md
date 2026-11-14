# M5 and M6

**What this holds:** Milestones M5 (performance hardening) and M6 (compute showcases), as planned. Not started, and not work items yet. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

## M5 — Performance hardening (≈3 wks)

- Two-phase occlusion culling (optional if targets are already met).
- HZB tile-coverage feedback into `Budgeted`.
- Upload budgeting; the remaining `Budgeted` stability and prediction work.
- Benchmark suite v2 ([benchmark-suite.md](../design/benchmark-suite.md), "Later (v2 and beyond)", [benchmark-analysis-and-experience.md](../design/benchmark-analysis-and-experience.md)): nightly runs on dedicated machines,
  a results store, change points, alerts and triage, automatic
  bisection, pull-request comments, scene pages, "what differs" analysis,
  traces from the report.
- _Exit_: [performance-methodology.md](../design/performance-methodology.md) targets met or the gap explained, including multi-view.

## M6 — Compute showcases and future-proofing (time-boxed, pick 2–3)

- Gaussian splats with GPU sort. How they meet occlusion feedback (blended, so never occluders as drawn; an optional solid depth past an opacity threshold) is in `docs/superpowers/plans/2026-11-12-transform-graph.md`, Task 12, fix 7.
- Two-pass compute point clouds.
- GPU styling; CAD edges.
- Engine-in-worker.
- WebXR.
- Headless rendering via Dawn.
