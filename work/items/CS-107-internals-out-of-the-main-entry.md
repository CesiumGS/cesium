---
id: CS-107
title: Internals out of the main entry
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438, CS-28]
touches: [packages/next/src/index.ts, packages/next/src/gpu/index.ts, packages/next/src/scene/World.ts, packages/next/src/scene/Engine.ts, packages/next/test/importBoundary.test.ts, packages/next/api/surface.txt]
---

Internals out of the main entry.

## Done when

- Nothing exported from the main entry is refused by the channel transport.
- The import-boundary test enforces this.
- Night-sky and translucency run, on a stage module or forced to main-thread mode.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
