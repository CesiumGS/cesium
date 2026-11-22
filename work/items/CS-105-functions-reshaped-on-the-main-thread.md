---
id: CS-105
title: Functions reshaped, on the main thread
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
touches: [packages/next/src/transform/**, packages/next/src/frames/**, packages/next/src/query/**, packages/next/src/scene/Engine.ts, packages/next/src/thread/modules.ts]
---

Functions reshaped on the main thread: self-contained functions and modules. Needs the owner's decision on the API review's proposals (CS-438). The program forms are CS-106, split out because only they wait for Cesium IR.

## Done when

- No public parameter's type is a bare function.
- The transform-graph and frames examples run on module or program forms.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
