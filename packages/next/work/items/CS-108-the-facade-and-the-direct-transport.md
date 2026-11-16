---
id: CS-108
title: The façade and the direct transport
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-103, CS-104, CS-107]
touches: [packages/next/src/thread/**, packages/next/src/thread/facade/**, packages/next/src/thread/host.ts, packages/next/src/thread/transport.ts, packages/next/src/thread/snapshotStore.ts, packages/next/src/thread/queries.ts, packages/next/src/index.ts, packages/next/api/surface.txt]
---

The façade and the direct transport.

## Done when

- The full suite passes in main-thread mode through the façade.
- Per-command overhead is measured in a Node micro-benchmark and recorded in the bench results.
- `api/surface.txt` changes only where CS-103 to CS-107 changed it.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
