---
id: CS-112
title: Errors and loss, `restart()`
kind: work
status: Planned
created: 2026-11-13
project: CS-13
needs: [CS-110]
---

Errors and loss, `restart()`.

## Done when

- Each error path reaches the app as an `EngineError` with its code (tests on the channel transport).
- A killed worker restarts on a fresh canvas, in a worker and then on the main thread (a browser check).

## Files

- `src/thread/errors.ts`
- `host.ts`
- `transport.ts`
- `GpuDevice.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
