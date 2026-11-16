---
id: CS-181
title: 1.x's `Cesium3DTileset.getHeight` misses geometry the renderer draws
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

`Cesium3DTileset.getHeight` (what 1.x clamps models to on 3D Tiles) misses geometry the renderer draws: on OSM Buildings it found no surface at 25 of 49 and 18 of 29 grid points that `Scene.sampleHeight` hits, and a lower surface (up to 53 m) at 4 more per view. Causes in reach: geocentric ray, first tile with any hit instead of the nearest hit, `pickModel` culling back faces.

- **For:** CesiumJS 1.x
- **Where it is explained:** `docs/history/m3-progress.md`, increment 5
- **Status (2026-11-13):** To file
- Formerly row 9 of the overall plan's follow-ups table.
