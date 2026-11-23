---
id: CS-1152
title: "Dyno's overview compares like with like: GPU and CPU time per frame for both engines, and frame time labeled for what it is"
kind: work
state: planned
created: 2026-11-23
project: CS-199
---

> **Committed by the owner (2026-11-23).** Why: the overview's frame p95 isn't comparable across engines. In the nightly of 2026-11-23 (2026-11-23T07-16-05-418Z), 1.x's frame time is its CPU time (aec-design-site uncapped: frame p50 18.6 ms against CPU p50 18.2 ms), while 2.0's is the interval between presented frames, waiting on the GPU included. Only 2.0 records GPU time (`gpuP50`, from WebGPU timestamp queries). The owner expects 2.0's GPU time per frame to be well under 1.x's, but nothing measures 1.x's.

## Done when

- 1.x runs record GPU time per frame: from WebGL's timer query (`EXT_disjoint_timer_query_webgl2`), if a browser flag enables it in the runner's browser on this Mac's ANGLE-on-Metal path, stated either way; otherwise from a GPU-bound measurement both engines share, defined in the item's design note.
- The overview shows GPU time per frame and CPU time per frame side by side for both engines, measured the same way. Frame p95 is either defined identically for both engines, or labeled for what it is.
- The two odd 2.0 results in that run are explained: milk-truck-fleet's GPU p50 of 290 ms, and aec-design-site's frame p95 of 154 ms against a frame p50 of 1 ms.
- A quiet run with valid ion scenes (after CS-1127) shows the comparison, cited by run ID.
