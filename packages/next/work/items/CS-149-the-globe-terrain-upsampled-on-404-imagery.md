---
id: CS-149
title: The globe (terrain upsampled on 404, imagery recovery)
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-147, CS-148]
---

The globe (terrain upsampled on 404, imagery recovery).

## Done when

Terrain and imagery tests on the fake device: a transient failure retries and loads; a 404 terrain tile is upsampled; a failed imagery source recovers after its cool-down.

## Files

- `globe/TerrainSource.ts`
- `GlobeImagery.ts`
- `io/worker.ts`
- `tileRetry.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
