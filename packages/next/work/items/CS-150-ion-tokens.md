---
id: CS-150
title: ion tokens
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-147]
touches: [packages/next/src/io/ion.ts, packages/next/src/globe/ImageryProvider.ts, packages/next/src/streaming/tilesetLoad.ts, packages/next/src/scene/Engine.ts]
---

ion tokens.

## Done when

- 50 simultaneous 401s cause one token refresh.
- A refresh never loops.
- No token or query string appears in any output.
- The 403 refresh is kept or dropped according to what the real Cesium ion service returns for a stale token, measured with a token the owner supplies.
- The token tests cover the first three.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
