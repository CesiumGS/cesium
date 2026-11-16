---
id: CS-182
title: 1.x's `sampleTerrain` keeps the input height when sampling fails
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

`sampleTerrain` keeps a position's input height when sampling fails after a mesh was built, instead of returning undefined.

- **For:** CesiumJS 1.x
- **Where it is explained:** docs/clamping-1x-spec.md `docs/design/performance-methodology.md`
- **Status (2026-11-13):** To file
- Formerly row 10 of the overall plan's follow-ups table.
