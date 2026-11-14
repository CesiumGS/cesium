---
id: CS-180
title: 1.x's `QuantizedMeshTerrainData.interpolateHeight` returns undefined for loaded tiles
kind: external
status: Planned
created: 2026-11-13
project: CS-19
party: CesiumJS 1.x
---

## Waiting on

`QuantizedMeshTerrainData.interpolateHeight` returns undefined for every loaded globe tile: it scales u and v to 0..32767 before branching, and the mesh branch compares them with texture coordinates decoded to 0..1; the other branch's quantized buffers are freed once the mesh exists. `sampleTerrain` works only because it fetches fresh terrain data.

- **For:** CesiumJS 1.x
- **Where it is explained:** `docs/history/m3-progress.md`, increment 5
- **Status (2026-11-13):** To file
- Formerly row 8 of the overall plan's follow-ups table.
