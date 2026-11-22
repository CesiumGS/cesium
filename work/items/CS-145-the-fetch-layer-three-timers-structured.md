---
id: CS-145
title: The fetch layer (three timers, structured failures, `isCancel`)
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-144, CS-847]
touches: [packages/next/src/io/fetchFailure.ts, packages/next/src/io/fetchBytes.ts, packages/next/src/io/worker.ts, packages/next/src/io/gltfParse.ts, packages/next/src/io/Jobs.ts, packages/next/src/streaming/Tile.ts, packages/next/src/streaming/tilesetLoad.ts]
---

The fetch layer (three timers, structured failures, `isCancel`).

## Done when

- A stalled request fails after its deadline instead of waiting.
- No site mistakes a timeout for a cancel: the sites that recognised `AbortError` by name are found by search and use `isCancel`.
- No message carries a URL (tested).
- `fetchBytes` and failure tests pass.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
