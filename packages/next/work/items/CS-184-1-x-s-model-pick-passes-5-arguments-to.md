---
id: CS-184
title: 1.x's `Model.pick` passes 5 arguments to `pickModel`'s 7
kind: external
status: Planned
created: 2026-11-13
project: CS-19
party: CesiumJS 1.x
---

## Waiting on

`Model.pick` passes 5 arguments to `pickModel`'s 7, so `result` lands in `ellipsoid`; tile content works by accident.

- **For:** CesiumJS 1.x
- **Where it is explained:** docs/clamping-1x-spec.md `docs/design/performance-methodology.md`
- **Status (2026-11-13):** To file
- Formerly row 12 of the overall plan's follow-ups table.
