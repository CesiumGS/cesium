---
id: CS-104
title: Writes reshaped, on the main thread
kind: work
status: Planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
---

Writes reshaped, on the main thread.

## Done when

No public object is read by the engine after the app mutates it in place; `requestRender()` is no longer needed for any public write (the docs' list in `renderMode` is empty).

## Files

- `Camera.ts`
- `View.ts`
- `World.ts`
- `Engine.ts`
- `Tileset3D.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
