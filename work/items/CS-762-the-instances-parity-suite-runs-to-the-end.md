---
id: CS-762
title: 'The instances parity suite runs to the end: releasing a model no longer throws "World: no slab 0"'
kind: work
state: planned
created: 2026-11-20
project: CS-195
touches: [packages/next/bench/instances.ts, packages/next/src/scene/gltfModel.ts, packages/next/src/scene/World.ts, packages/next/src/scene/Slabs.ts, packages/next/test]
---

The `instances` browser parity suite fails on the main branch before it measures anything. It throws "World: no slab 0" (`src/scene/Slabs.ts`) from `World.removeMesh`, called by `ModelResource.release` (`src/scene/gltfModel.ts`). CS-33's executor found it on 2026-11-20. The suite fails the same way on base d6c7a16f9d and on CS-33's tip, so CS-33 didn't cause it. `packages/next/AGENTS.md` asks for the parity suites whenever rendering changes, so every rendering item meets this until it's fixed, the same as CS-568 (the `lod` page).

Source: CS-33's report, relayed by orch-11. Why now: it blocks a parity comparison for every rendering change. Rough size: small to medium, depending on whether the page or the engine holds the bug. Decider: the executor, within the touches above; a change to the slab lifetime rule comes back as a question. Filed: 2026-11-20.

## Done when

- `node bench/run.mjs instances` runs to the end on the main branch.
- The cause is found and named: whether the page releases a model twice or after its world, or `ModelResource.release` frees a mesh whose slab is already gone.
- A Node test reproduces the throw with `test/fakeGpu.ts` and passes after the fix.
- If the engine was at fault, releasing a model twice is either a no-op or a clear error that names the model, never "no slab 0".
- Run on a server of the executor's own, never the owner's 5190 or 5199.
