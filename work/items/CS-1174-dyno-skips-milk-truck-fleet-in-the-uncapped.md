---
id: CS-1174
title: Dyno skips milk-truck-fleet in the uncapped orbit
kind: work
state: planned
created: 2026-11-23
project: CS-199
needs: [CS-1173]
---

The owner answered CS-1173 A on 2026-11-23: take milk-truck-fleet out of `uncapped-orbit`. With no frame cap, 2.0 queues work that costs about 600 ms of GPU time per frame on that scene (run 2026-11-24T02-58-14-658Z-mac-apple), and CS-1152's first proof run lost the WebGPU device there. The GPU is shared with every other app on the machine.

## Done when

- The catalog can skip a scenario per scene, with a reason, and milk-truck-fleet skips `uncapped-orbit` with that reason.
- A suite run lists the skip and its reason, rather than leaving the cell blank; the Overview and the run report say so too.
- The GPU-paced orbit still measures milk-truck-fleet, and no other scene's scenarios change.
- Tests cover the skip, with a mutation that removes it.
