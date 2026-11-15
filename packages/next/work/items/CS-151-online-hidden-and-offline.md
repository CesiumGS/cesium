---
id: CS-151
title: Online, hidden and offline
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-147]
---

Online, hidden and offline.

## Done when

- The `NetState` tests pass.
- Worker timer drift in a hidden headed Chrome tab is measured, and the suspended rule's thresholds hold against it or are changed.

## Files

- `src/streaming/NetState.ts`
- `RequestScheduler.ts`
- `Engine.ts`
- `tileRetry.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
