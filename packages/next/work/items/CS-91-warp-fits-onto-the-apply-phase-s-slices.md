---
id: CS-91
title: Warp fits onto the apply phase's slices
kind: work
status: Planned
created: 2026-11-13
project: CS-12
needs: [CS-86]
---

A main-thread budget onto the apply phase's slices: warp fits. Needs nothing beyond the first slice (CS-86).

## Done when

- `warpTick`'s warp fits run as progressive jobs.
- Closure warps fit in a main-thread slice of the apply phase.

Program-form warps' fits run off the main thread once program forms exist: that is CS-510, which needs this item and CS-105.

## Files

- `src/scene/Engine.ts`
