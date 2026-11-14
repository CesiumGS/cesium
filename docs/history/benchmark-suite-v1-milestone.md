# Benchmark suite v1 (after M3)

**What this holds:** The benchmark suite's first milestone as planned. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

The [benchmark-suite.md](../design/benchmark-suite.md) foundations, enough for first 1.x vs 2.0 numbers on
representative content; it then guards every later milestone.

- The dataset, scene and scenario schemas; the public manifest in the
  repo and private manifests outside it; `fetch` and `verify` (checksums)
  into a local content-addressed store.
- The engine adapter interface with a 1.x adapter (this repo's build,
  pinned) and a 2.0 adapter; the existing harnesses (`baseline`, `hitch`,
  `lod`, `trace`) move onto it.
- 10-15 scenes across the three catalog groups ([benchmark-suite.md](../design/benchmark-suite.md), "Catalog (initial)"), cold and warm,
  unthrottled and one throttled profile.
- A report per run: each metric per scene, 2.0 against 1.x with
  confidence intervals, and the environment fingerprint; a runner page
  and a results page with comparisons and trends ([benchmark-suite.md](../design/benchmark-suite.md), "Interfaces: agents, scripts and people").
- The first phase of [benchmark-analysis-and-experience.md](../design/benchmark-analysis-and-experience.md): lap overlays with delta traces and track
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
