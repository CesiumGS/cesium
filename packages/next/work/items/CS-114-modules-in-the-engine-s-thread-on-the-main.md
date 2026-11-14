---
id: CS-114
title: Modules in the engine's thread, on the main thread
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: the façade
needs: [CS-108]
---

Modules in the engine's thread, with the engine on the main thread. Needs CS-108. The worker case is CS-115.

## Done when

A tick module changes the scene in the tick it runs in both modes (test); a controller module drives the camera from forwarded input in the worker suite.

## Files

- `src/thread/modules.ts`
- `Engine.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
