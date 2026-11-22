---
id: CS-183
title: 1.x's terrain height callbacks pass terrain-only heights
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

Terrain height callbacks pass terrain-only heights, so a clamp-to-ground billboard can drop off a tileset roof until a tileset callback fires.

- **For:** CesiumJS 1.x
- **Where it is explained:** docs/clamping-1x-spec.md `docs/design/why-1x-is-slow.md`
- **Status (2026-11-13):** To file
- Formerly row 11 of the overall plan's follow-ups table.
