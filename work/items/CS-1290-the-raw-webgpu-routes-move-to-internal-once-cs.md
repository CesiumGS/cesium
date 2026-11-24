---
id: CS-1290
title: The raw WebGPU routes move to internal once CS-848's slots cover the sprites example
kind: work
state: proposed
created: 2026-11-24
project: CS-437
needs: [CS-848, CS-1288]
---

> **Proposal.** Source: the owner's answer to CS-1288, 2026-11-24 ("A, then B later"). Why now: the three raw routes stay public only for alpha.1. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `GraphStage.register`'s `ChainIo.device`, `World.addFrameCompute`'s `GPUComputePassEncoder` and `Engine.gpu` move to `@cesium/core/internal` (or the 0.x line).
- `examples/night-sky/sprites.ts` and `examples/translucency/main.ts` use seam routes instead.
- `npm run surface` and the API review record the change.
