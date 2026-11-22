---
id: CS-931
title: "The handbook builds again on main: its data step builds dist first, and workerPool.ts type-checks"
kind: work
state: in-progress
created: 2026-11-22
project: CS-609
claimed_by: orch-11-CS-931
---

> **Committed by the owner**, through their approval of the work to get 2.0 onto a clean tree, CS-612 and CS-613 included (2026-11-22). Source: orch-11's checks on CS-613 (2026-11-22). The handbook built when CS-911 merged and fails on main since CS-612 (`a7e939a5b4`). CS-613's new CI handbook job fails until this is fixed. Merges under the same bar as the move.

## Done when

- `npm run handbook` builds on a fresh checkout. Its data step builds `dist/` first, or says plainly that a build is needed.
- `handbook/viewer/workerPool.ts` type-checks: `TextureFormatSupport` is imported from where it now lives (TS2305), and `parseGltf`'s headers argument matches `GltfFetch` (TS2345).
- The cause is named: which merge broke it, and why its checks didn't catch it.
