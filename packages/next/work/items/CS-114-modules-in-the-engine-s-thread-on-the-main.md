---
id: CS-114
title: Modules in the engine's thread, on the main thread
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-108]
---

Modules in the engine's thread, with the engine on the main thread. Needs CS-108. The worker case is CS-115.

## Done when

- With the engine on the main thread, a tick module changes the scene in the tick it runs.
- With the engine on the main thread, a controller module drives the camera from input.

## Files

- `src/thread/modules.ts`
- `Engine.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
