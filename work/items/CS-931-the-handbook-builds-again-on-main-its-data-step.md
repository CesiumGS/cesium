---
id: CS-931
title: "The handbook builds again on main: its data step builds dist first, and workerPool.ts type-checks"
kind: work
state: done
created: 2026-11-22
project: CS-609
claimed_by: orch-11-CS-931
---

> **Committed by the owner**, through their approval of the work to get 2.0 onto a clean tree, CS-612 and CS-613 included (2026-11-22). Source: orch-11's checks on CS-613 (2026-11-22). The handbook built when CS-911 merged and fails on main since CS-612 (`a7e939a5b4`). CS-613's new CI handbook job fails until this is fixed. Merges under the same bar as the move.

## Done when

- `npm run handbook` builds on a fresh checkout. Its data step builds `dist/` first, or says plainly that a build is needed.
- `handbook/viewer/workerPool.ts` type-checks: `TextureFormatSupport` is imported from where it now lives (TS2305), and `parseGltf`'s headers argument matches `GltfFetch` (TS2345).
- The cause is named: which merge broke it, and why its checks didn't catch it.

## Outcome

- **Data step:** `scripts/handbookData.mjs` builds the packages' `dist/` (`scripts/build.mjs --no-checks`) before it reads the bundle check, so `npm run handbook` is the one command, and an old `dist/` can't give figures for older code. `--no-bundles` (the dev server) doesn't build.
- **Type errors:** `handbook/viewer/workerPool.ts` takes `TextureTranscodePath` from `profile/paths.ts`, reads the job's `textureTarget` (the payload key the engine sends since CS-22; the old `textureSupport` read was also stale at run time), and passes `parseGltf` a `GltfFetch` built on `engineFetch` with the job's headers.
- **Cause:** CS-22 (`8fec985e35`, 2026-11-19) replaced `TextureFormatSupport` and CS-809 (`ae107e9387`, 2026-11-21) changed `parseGltf`'s third argument to a `GltfFetch`. Neither touched `handbook/viewer/`. Only `npm run handbook` type-checked it (`tsc -p handbook`): the root `tsconfig.json` didn't include `handbook/viewer`, `tsc --build` and `npm test` don't reach it, and no gate runs `npm run handbook`. The root `tsconfig.json` now includes `handbook/viewer`, so `npm run typecheck` (a merge gate) and `npx tsc --noEmit -p .` fail on this drift.
