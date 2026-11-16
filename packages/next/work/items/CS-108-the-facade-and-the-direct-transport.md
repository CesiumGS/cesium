---
id: CS-108
title: The façade and the direct transport
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-103, CS-104, CS-107]
---

The façade and the direct transport.

## Done when

- The full suite passes in main-thread mode through the façade.
- Per-command overhead is measured in a Node micro-benchmark and recorded in the bench results.
- `api/surface.txt` changes only where CS-103 to CS-107 changed it.

## Files

- `src/thread/`
- `facade/`
- `host.ts`
- `transport.ts`
- `snapshotStore.ts`
- `queries.ts`
- `src/index.ts`
- `api/surface.txt`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
