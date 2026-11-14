---
id: CS-145
title: The fetch layer (three timers, structured failures, `isCancel`)
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-144]
---

The fetch layer (three timers, structured failures, `isCancel`).

## Done when

`fetchBytes` and failure tests pass. The sites that recognised `AbortError` by name are found by search and use `isCancel`. A stalled request now fails after its deadline instead of waiting. Messages carry no URL (tested).

## Files

- `src/io/fetchFailure.ts`
- `fetchBytes.ts`
- `io/worker.ts`
- `gltfParse.ts`
- `Jobs.ts`
- `streaming/Tile.ts`
- `tilesetLoad.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
