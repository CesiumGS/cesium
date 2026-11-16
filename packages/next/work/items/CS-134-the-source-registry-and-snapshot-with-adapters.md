---
id: CS-134
title: The source registry and snapshot, with adapters and a check against today's `needsTicks`; no behaviour change
kind: work
state: planned
created: 2026-11-13
project: CS-15
---

The source registry and snapshot, with adapters and a check against today's `needsTicks`; no behaviour change. Needs nothing.

## Done when

A test-only check holds on the fake-device scenarios (`onDemandIdle`, `geomorph`, `casterLoop`, `frameLoopSleep`): `needsTicks()` agrees with "a change, a request, or an entry that wants ticks", the `jobs` reason included. Per-view streaming counts are tested with two views. A tile stays pending until its decode job's `apply` step runs.

## Files

- `src/scene/refinement.ts`
- `src/streaming/Tileset3D.ts`
- `src/globe/GlobeImagery.ts`
- `src/scene/HeightClamping.ts`
- `src/scene/world/warps.ts`
- `src/scene/World.ts`
- `src/scene/occlusionFeedback.ts`
- `src/io/Jobs.ts`
- `src/scene/Engine.ts`

Detail: `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
