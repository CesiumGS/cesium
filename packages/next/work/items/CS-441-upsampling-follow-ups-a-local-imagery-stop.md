---
id: CS-441
title: "Upsampling follow-ups: a local imagery stop, child refetches inside the terrain request window, imagery slices in the byte budget"
kind: work
state: planned
created: 2026-11-14
project: CS-16
---

## Done when

- Upsampling has a local imagery stop (an `upsampledFromParent` rule).
- A child's refetch after eviction goes through the terrain request window.
- Imagery slices count in the byte budget.
- Upsampling through the real worker draws what the main-thread path draws (`test/terrainUpsampleEngine.test.ts` or the headless check).

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 5a", "Upsampling follow-ups".
