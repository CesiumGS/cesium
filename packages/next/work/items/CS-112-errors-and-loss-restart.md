---
id: CS-112
title: Errors and loss, `restart()`
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: the façade
needs: [CS-110]
---

Errors and loss, `restart()`.

## Done when

Tests on the channel transport for each error path; a browser check that kills the worker and restarts on a fresh canvas, in a worker and then on the main thread.

## Files

- `src/thread/errors.ts`
- `host.ts`
- `transport.ts`
- `GpuDevice.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
