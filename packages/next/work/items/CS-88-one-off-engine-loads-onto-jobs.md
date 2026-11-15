---
id: CS-88
title: One-off engine loads onto `Jobs`
kind: work
status: Planned
created: 2026-11-13
project: CS-12
needs: [CS-86]
---

One-off engine loads onto `Jobs`. Needs nothing beyond the first slice (CS-86).

## Done when

- The glare kernel, star field and sky pack loads queue below visible content.
- Each of these loads is cancelled when the engine is disposed.

## Files

- `src/scene/Engine.ts`
