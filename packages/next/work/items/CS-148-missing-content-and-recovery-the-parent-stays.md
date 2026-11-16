---
id: CS-148
title: Missing content and recovery (the parent stays, cool-downs, `retryFailed()`)
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-147]
---

Missing content and recovery (the parent stays, cool-downs, `retryFailed()`).

## Done when

A 404 child leaves its REPLACE parent drawn and the tileset settles; a cooled-down tile reloads when wanted; `retryFailed()` resets. The rest of the suite is unchanged.

## Files

- `Tile.ts`
- `Stepwise.ts`
- `tilesetUpdate.ts`
- `tilesetLoad.ts`
- `test/composite.test.ts`
- `test/tilesetFrame.test.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
