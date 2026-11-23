---
id: CS-147
title: Retries for 3D Tiles content (episodes owned by the tile)
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-146, CS-554]
touches: [packages/next/src/streaming/tileRetry.ts, packages/next/src/io/backoff.ts, packages/next/src/streaming/tilesetLoad.ts, packages/next/src/streaming/tilesetState.ts, packages/next/src/streaming/Tile.ts, packages/next/src/streaming/tilesetTypes.ts, packages/next/src/streaming/Tileset3D.ts]
---

Retries for 3D Tiles content (episodes owned by the tile).

## Done when

- A transient 503 retries and the content loads.
- A 200-tile outage makes a bounded number of attempts.
- Retries hold at most a quarter of the request window.
- The verdict table and episode tests pass, including the 200-tile outage, cancelled-in-backoff and the retry slot cap.
- Existing streaming tests pass unchanged.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.

## Note (2026-11-22)

Under CS-995 A (the seam lands first where the two chains touch the same code), this item now also needs CS-554. It reworks the same streaming or globe loading code as the seam's 3D Tiles and globe items (the Fable critical-path review, finding 8).
