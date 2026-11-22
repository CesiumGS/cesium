---
id: CS-151
title: Online, hidden and offline
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-147]
touches: [packages/next/src/streaming/NetState.ts, packages/next/src/streaming/RequestScheduler.ts, packages/next/src/scene/Engine.ts, packages/next/src/streaming/tileRetry.ts]
---

Online, hidden and offline.

## Done when

- The `NetState` tests pass.
- Worker timer drift in a hidden headed Chrome tab is measured, and the suspended rule's thresholds hold against it or are changed.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
