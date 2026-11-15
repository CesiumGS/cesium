---
id: CS-113
title: The opt-in scene rebuild on loss
kind: work
status: Planned
created: 2026-11-13
project: CS-13
needs: [CS-112]
---

The opt-in scene rebuild on loss.

## Done when

A test kills the engine (channel transport) and the rebuilt scene matches the mirror; a browser check loses the device and comes back with the same scene, in a worker and on the main thread.

## Files

- `src/thread/facade/`
- `host.ts`
- `errors.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
