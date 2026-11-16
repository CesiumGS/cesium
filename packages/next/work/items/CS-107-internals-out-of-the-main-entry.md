---
id: CS-107
title: Internals out of the main entry
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438, CS-28]
---

Internals out of the main entry.

## Done when

- Nothing exported from the main entry is refused by the channel transport.
- The import-boundary test enforces this.
- Night-sky and translucency run, on a stage module or forced to main-thread mode.

## Files

- `src/index.ts`
- `src/gpu/index.ts`
- `World.ts`
- `Engine.ts`
- `test/importBoundary.test.ts`
- `api/surface.txt`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
