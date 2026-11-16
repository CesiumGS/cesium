---
id: CS-174
title: 1.x computes NaN for a root without the top-level `geometricError`
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

A tileset without the required top-level `geometricError` makes 1.x compute `NaN` for the root's early-out SSE, so the root is never skipped. `Stepwise` copies it; `Budgeted` falls back to the root's error for refinement and never hides the tileset.

- **For:** CesiumJS 1.x
- **Where it is explained:** `docs/history/m2-progress.md` (selection parity)
- **Status (2026-11-13):** Asked whether known or by design
- Formerly row 1 of the overall plan's follow-ups table.
