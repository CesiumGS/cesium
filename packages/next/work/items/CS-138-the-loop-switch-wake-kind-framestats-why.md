---
id: CS-138
title: The loop switch (`wake(kind)`, `FrameStats.why`)
kind: work
status: Planned
created: 2026-11-13
project: CS-15
needs: [CS-134]
---

The loop switch (`wake(kind)`, `FrameStats.why`). Needs CS-134.

## Done when

CS-134's check is removed because it's now true by construction. The power tests pass unchanged on `stats.loop`. Unattributed wakes are zero in the fake-device scenarios.

## Files

- `src/scene/Engine.ts`
- `src/scene/engineContent.ts`
- `src/scene/ShaderBindings.ts`
- `src/scene/world/caps.ts`
- `src/scene/HeightClamping.ts`
- `src/scene/world/routes.ts`
- `src/render/world/bundles.ts`
- `src/streaming/DrawSink.ts`
- `widgets/recorder.ts`
- `widgets/recorderRows.ts`
- `bench/suite/`

Detail: `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
