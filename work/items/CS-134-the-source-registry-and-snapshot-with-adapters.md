---
id: CS-134
title: The source registry and snapshot, with adapters and a check against today's `needsTicks`; no behaviour change
kind: work
state: planned
created: 2026-11-13
project: CS-15
touches: [packages/next/src/scene/refinement.ts, packages/next/src/streaming/Tileset3D.ts, packages/next/src/globe/GlobeImagery.ts, packages/next/src/scene/HeightClamping.ts, packages/next/src/scene/world/warps.ts, packages/next/src/scene/World.ts, packages/next/src/scene/occlusionFeedback.ts, packages/next/src/io/Jobs.ts, packages/next/src/scene/Engine.ts]
---

The source registry and snapshot, with adapters and a check against today's `needsTicks`; no behaviour change. Needs nothing.

## Done when

A test-only check holds on the fake-device scenarios (`onDemandIdle`, `geomorph`, `casterLoop`, `frameLoopSleep`): `needsTicks()` agrees with "a change, a request, or an entry that wants ticks", the `jobs` reason included. Per-view streaming counts are tested with two views. A tile stays pending until its decode job's `apply` step runs.

## Plan

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
