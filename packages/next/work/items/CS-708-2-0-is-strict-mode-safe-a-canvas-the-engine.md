---
id: CS-708
title: "2.0 is strict-mode safe: a canvas the engine draws survives create, dispose and create again without the caller doing anything"
kind: work
state: planned
created: 2026-11-19
project: CS-437
touches: [packages/next/src/scene/**, packages/next/src/gpu/**, packages/next/src/streaming/**, packages/next/src/frames/**, packages/next/widgets/**, packages/next/test/**]
---

The owner, 2026-11-19: "i suspect we also need to make sure 2.0 is strict mode safe, as that might be part of the cold start thing that executor is chasing. i'd like for the user of the library to not have to worry about a canvas that 2.0 is drawing being strict mode safe." React's `<StrictMode>` mounts, unmounts and mounts every effect again in development, and other frameworks do the same on fast refresh. Dyno renders under it (`bench/suite/app.tsx`), and a cold probe of its viewer on 2026-11-19 saw each reference-frame file (EOP-All.csv, the DE440 planet and Moon packs) fetched exactly twice. CS-706 measures what the double mount costs; this item makes the library safe for it.

## Done when

- Creating an engine or viewer on a canvas, disposing it, and creating it again at once (in the same tick, or before the first finished async), is correct and cheap. Nothing leaks: GPU device, adapter, buffers, workers, listeners and observers. The second creation reuses what's shareable: the adapter and device where allowed, shaders and pipelines in the cache, reference data and other loads already in flight (deduplicated and cancelled, not refetched). Disposing during startup cancels cleanly, with no errors in the console and no "device lost".
- A canvas can be handed from a disposed engine to a new one (the WebGPU context reconfigured), and the same holds for `OffscreenTarget` and worker mode where they exist.
- The public API documents the contract in one place: what a caller may do in an effect and its cleanup, with no special handling needed under strict mode.
- Tests: a Node test with `test/fakeGpu.ts` creates, disposes and creates again in one tick and asserts no leaked resources and one fetch per data file; a small browser page renders a React `<StrictMode>` viewer and checks the console stays clean and data is fetched once.
- The cost of a strict-mode double mount on a cold start is measured as a Dyno run, before and after.
