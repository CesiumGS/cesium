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
- A GPU-paced mode, measured the same way for both engines with no extension: each tick waits for the GPU to finish before the next (WebGPU's `onSubmittedWorkDone`, WebGL's fence with `clientWaitSync`), so the frame interval is the whole cost of a frame. The existing uncapped runs (`--disable-gpu-vsync`, `--disable-frame-rate-limit`) don't measure that: requestAnimationFrame doesn't wait for the GPU, so 1.x's interval tracks its CPU time, and 2.0's reads 1 ms while its GPU takes 22 ms (aec-design-site) until the queue backs up.
- The overview shows GPU time per frame and CPU time per frame side by side for both engines, measured the same way. Frame p95 is either defined identically for both engines, or labeled for what it is.
- The two odd 2.0 results in that run are explained: milk-truck-fleet's GPU p50 of 290 ms, and aec-design-site's frame p95 of 154 ms against a frame p50 of 1 ms.
- A quiet run with valid ion scenes (after CS-1127) shows the comparison, cited by run ID.
