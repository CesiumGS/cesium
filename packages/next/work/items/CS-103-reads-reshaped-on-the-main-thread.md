---
id: CS-103
title: Reads reshaped, on the main thread
kind: work
status: Planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
---

Reads reshaped, on the main thread.

## Done when

No public synchronous read takes arbitrary arguments except `toPixel` and `fromPixel`; the examples run unchanged to the eye (the parity suites at their baselines).

## Files

- `View.ts`
- `Engine.ts`
- `src/scene/snapshot.ts`
- `src/scene/tracked.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
