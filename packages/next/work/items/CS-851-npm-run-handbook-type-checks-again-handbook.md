---
id: CS-851
title: "npm run handbook type-checks again: handbook/viewer/workerPool.ts and src/io/decoders.ts agree on TextureFormatSupport"
kind: work
state: planned
created: 2026-11-21
project: CS-199
touches: [packages/next/handbook/viewer/workerPool.ts, packages/next/src/io/decoders.ts]
---

`npm run handbook` fails its type check on main and on the base commit (TS2305). `handbook/viewer/workerPool.ts` imports `TextureFormatSupport`, but `src/io/decoders.ts` doesn't export it. The vite build alone succeeds.

Source: CS-552's and orch-11's checks, 2026-11-21. Why now: the handbook can't be built cleanly. Rough size: small. Decider: the executor. Whether the type is exported or the import changes depends on what the handbook needs. Filed: 2026-11-21.

## Done when

- `npm run handbook` passes its type check and builds.
- The fix doesn't widen the public API unless the type is meant to be public. If it is, `npm run surface` is run and `api/surface.txt` is committed.
