---
id: CS-105
title: Functions reshaped, on the main thread
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: reshape
needs: [CS-102]
---

Functions reshaped on the main thread: self-contained functions and modules. Needs the API review (CS-102). The program forms are CS-106, split out because only they wait for Cesium IR.

## Done when

No public parameter's type is a bare function; the transform-graph and frames examples run on module or program forms; CS-91's fits run off the main thread for every program-form warp.

## Files

- `src/transform/`
- `src/frames/`
- `src/query/`
- `Engine.ts`
- `src/thread/modules.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
