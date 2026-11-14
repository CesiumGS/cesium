---
id: CS-107
title: Internals out of the main entry
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: reshape
needs: [CS-102, CS-28]
---

Internals out of the main entry.

## Done when

The main entry exports no member of kind "can't cross"; the import-boundary test enforces it; night-sky and translucency run (on a stage module, or forced to main-thread mode).

## Files

- `src/index.ts`
- `src/gpu/index.ts`
- `World.ts`
- `Engine.ts`
- `test/importBoundary.test.ts`
- `api/surface.txt`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
