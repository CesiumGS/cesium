---
id: CS-149
title: The globe (terrain upsampled on 404, imagery recovery)
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-147, CS-148, CS-847, CS-555, CS-810]
touches: [packages/next/src/globe/TerrainSource.ts, packages/next/src/globe/GlobeImagery.ts, packages/next/src/io/worker.ts, packages/next/src/streaming/tileRetry.ts]
---

The globe (terrain upsampled on 404, imagery recovery).

## Done when

Terrain and imagery tests on the fake device: a transient failure retries and loads; a 404 terrain tile is upsampled; a failed imagery source recovers after its cool-down.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.

## Note (2026-11-22)

Under CS-995 A (the seam lands first where the two chains touch the same code), this item now also needs CS-555, CS-810. It reworks the same streaming or globe loading code as the seam's 3D Tiles and globe items (the Fable critical-path review, finding 8).
