---
id: CS-1173
title: Does milk-truck-fleet stay in Dyno's uncapped orbit?
kind: decision
state: done
created: 2026-11-23
project: CS-199
decider: owner
answer: "A. A. Skip it in the uncapped orbit: A per-scene skip in the catalog takes milk-truck-fleet out of `uncapped-orbit`, with the reason. Its GPU cost is measured by the GPU-paced orbit. The other scenes keep the uncapped orbit."
answered_at: 2026-11-24T03:19:25.816Z
answered_via: question-tool
answered_by: owner
---

## Question

In the uncapped orbit, 2.0 queues minutes of GPU work on milk-truck-fleet and the browser has lost its WebGPU device. Should Dyno take that scene out of the uncapped orbit, cap 2.0's frames in flight there, or keep it as it is?

CS-1152 found that 2.0 submits about every millisecond in the uncapped orbit, because `requestAnimationFrame` doesn't wait for the GPU, and milk-truck-fleet's 100,000 instanced trucks cost several hundred milliseconds of GPU time per frame. The 2026-11-23 nightly logged "Instance dropped" errors there, and CS-1152's proof run then lost WebGPU for the rest of that browser; the next scenes found no adapter. The GPU is shared with every other app on the machine. CS-1152 adds a GPU-paced orbit that measures what those frames cost without queuing them, and a lost device now fails a run with its reason. Until this is answered, the next nightly runs milk-truck-fleet's uncapped orbit again.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Skip it in the uncapped orbit: A per-scene skip in the catalog takes milk-truck-fleet out of `uncapped-orbit`, with the reason. Its GPU cost is measured by the GPU-paced orbit. The other scenes keep the uncapped orbit. (cost: A small Dyno change; the uncapped orbit loses one scene.)
- B. B. Cap frames in flight in uncapped runs: In uncapped runs, Dyno lets 2.0 keep only a few frames in flight (it waits for submitted work past a cap), for every scene. The uncapped orbit then measures something closer to the paced one. (cost: Changes what the uncapped orbit means for every scene, so its history needs a version note.)
- C. C. Keep it as it is: Nothing changes; the next nightly may lose the WebGPU device again on that scene and fail the scenes after it.

Recommended: A. Skip it in the uncapped orbit. The project's GPU rule is that a hung or overloaded GPU affects every app on the machine. The paced orbit already measures that scene's cost safely, and a skip changes no other scene's history.

If unanswered by 2026-11-25T12:00:00Z: A. Skip it in the uncapped orbit.

## Answer

Recorded in the front matter once answered.
