---
id: CS-104
title: Writes reshaped, on the main thread
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
touches: [packages/next/src/scene/Camera.ts, packages/next/src/scene/View.ts, packages/next/src/scene/World.ts, packages/next/src/scene/Engine.ts, packages/next/src/streaming/Tileset3D.ts]
---

Writes reshaped, on the main thread. The owner accepted observed value types in place of setters (`docs/superpowers/plans/2026-11-13-worker-facade.md`, section 8), so writes are commands.

## Done when

- No public object is read by the engine after the app mutates it in place.
- Every public write is a command, `camera.position.x = 5` included.
- No public write needs `requestRender()` to show.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
