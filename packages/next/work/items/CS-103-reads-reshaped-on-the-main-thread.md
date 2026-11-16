---
id: CS-103
title: Reads reshaped, on the main thread
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-438]
touches: [packages/next/src/scene/View.ts, packages/next/src/scene/Engine.ts, packages/next/src/scene/snapshot.ts, packages/next/src/scene/tracked.ts]
---

Reads reshaped, on the main thread.

## Done when

No public synchronous read takes arbitrary arguments except `toPixel` and `fromPixel`; the examples run unchanged to the eye (the parity suites at their baselines).

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
