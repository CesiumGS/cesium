---
id: CS-763
title: "Engine.create takes a signal: an aborted create releases its device and pipelines"
kind: work
state: planned
created: 2026-11-20
project: CS-437
touches: [packages/next/src/scene/Engine.ts, packages/next/src/gpu/GpuDevice.ts, packages/next/test, packages/next/api/surface.txt]
---

Engine.create gains a public `signal?: AbortSignal` option in EngineOptions. Today a create that is cancelled midway still finishes its device request and pipeline builds before it is disposed (CS-708 made that safe, not cheap). ViewerOptions doesn't get one: the Viewer already waits for a create in flight and adopts its engine.

Source: the owner's answer to CS-711 (A, Engine.create only), 2026-11-20. Why now: it is the API change that answer approved, and beta.1 freezes the lifetime contract. Rough size: small. Decider: the executor, within the touches above; any change to ViewerOptions comes back as a question. Filed: 2026-11-20.

## Done when

- `EngineOptions.signal` exists, with TSDoc, and Engine's lifetime contract says what an abort does at each stage of a create.
- An aborted create rejects with the signal's reason (an `AbortError` when it has none) and releases its device and every pipeline it built. A Node test with `test/fakeGpu.ts` aborts at each stage and checks that nothing is left.
- An already-aborted signal rejects at once, without requesting a device.
- `npm run surface` is run and `api/surface.txt` is committed with the change.
