# Performance methodology

**What this holds:** How performance is measured: targets, the main-thread and GPU timings, allocations and the rules for comparing runs. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

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
