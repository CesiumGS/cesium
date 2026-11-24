---
id: CS-1288
title: Do the three raw WebGPU routes stay public at alpha.1, beside the seams-only context?
kind: decision
state: planned
created: 2026-11-24
project: CS-437
decider: owner
---

## Question

CS-972 (a render feature's context reaches the GPU only through the seams) found three public routes that still give outside code raw WebGPU access, beside the seams-only context:

- `GraphStage.register`'s `ChainIo.device`, used by `examples/night-sky/sprites.ts`;
- `World.addFrameCompute`'s `GPUComputePassEncoder`;
- `Engine.gpu`: `examples/translucency/main.ts` writes through `engine.gpu.device.queue`.

Do they stay public at alpha.1? Raised in CS-972's first report; the decider is the owner by `hitld rights who` (basis: security), and `hitld precedent match` found no candidates. Nothing in CS-972's branch depends on the answer. Filed 2026-11-24, late: it sat in the executor's report since the first round.

## Options and recommendation

- A. Keep them, and name them in the API review as an explicit raw tier outside the seams' promise.
- B. Move them to `@cesium/core/internal` or the 0.x line before alpha.1, and give the two examples seam routes.
- C. Leave them as they are, unnamed.

Recommended: A for alpha.1, then B once CS-848's slots cover what `sprites.ts` does.

## Answer

Open.
