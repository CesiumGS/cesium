---
id: CS-113
title: The opt-in scene rebuild on loss
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-112]
touches: [packages/next/src/thread/facade/**, packages/next/src/thread/host.ts, packages/next/src/thread/errors.ts]
---

The opt-in scene rebuild on loss.

## Done when

A test kills the engine (channel transport) and the rebuilt scene matches the mirror; a browser check loses the device and comes back with the same scene, in a worker and on the main thread.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
