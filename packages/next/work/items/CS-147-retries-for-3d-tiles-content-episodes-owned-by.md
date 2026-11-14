---
id: CS-147
title: Retries for 3D Tiles content (episodes owned by the tile)
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-146]
---

Retries for 3D Tiles content (episodes owned by the tile).

## Done when

The verdict table and episode tests pass, including the 200-tile outage (bounded attempts), cancelled-in-backoff and the retry slot cap. Existing streaming tests pass unchanged.

## Files

- `src/streaming/tileRetry.ts`
- `src/io/backoff.ts`
- `tilesetLoad.ts`
- `tilesetState.ts`
- `Tile.ts`
- `tilesetTypes.ts`
- `Tileset3D.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
