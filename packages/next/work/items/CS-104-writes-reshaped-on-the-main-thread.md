---
id: CS-104
title: Writes reshaped, on the main thread
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
---

Writes reshaped, on the main thread. The owner accepted observed value types in place of setters (`docs/superpowers/plans/2026-11-13-worker-facade.md`, section 8), so writes are commands.

## Done when

- No public object is read by the engine after the app mutates it in place.
- Every public write is a command, `camera.position.x = 5` included.
- No public write needs `requestRender()` to show.

## Files

- `Camera.ts`
- `View.ts`
- `World.ts`
- `Engine.ts`
- `Tileset3D.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
