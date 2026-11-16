---
id: CS-153
title: The refinement entries
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-149, CS-134]
touches: [packages/next/src/streaming/Tileset3D.ts, packages/next/src/globe/GlobeImagery.ts]
---

The refinement entries.

## Done when

CS-134's agreement check still holds; a test with a flaky origin shows `retrying`, then `failed`, then `pending` again after the cool-down; `converged({ timeoutMs })` ends with the failure counted.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
