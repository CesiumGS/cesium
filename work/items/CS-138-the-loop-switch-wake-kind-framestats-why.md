---
id: CS-138
title: The loop switch (`wake(kind)`, `FrameStats.why`)
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-134]
touches: [packages/next/src/scene/Engine.ts, packages/next/src/scene/engineContent.ts, packages/next/src/scene/ShaderBindings.ts, packages/next/src/scene/world/caps.ts, packages/next/src/scene/HeightClamping.ts, packages/next/src/scene/world/routes.ts, packages/next/src/render/world/bundles.ts, packages/next/src/streaming/DrawSink.ts, packages/next/widgets/recorder.ts, packages/next/widgets/recorderRows.ts, packages/next/bench/suite/**]
---

The loop switch (`wake(kind)`, `FrameStats.why`). Needs CS-134.

## Done when

CS-134's check is removed because it's now true by construction. The power tests pass unchanged on `stats.loop`. Unattributed wakes are zero in the fake-device scenarios.

## Plan

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
