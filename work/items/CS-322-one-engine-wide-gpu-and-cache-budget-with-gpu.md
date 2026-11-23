---
id: CS-322
title: One engine-wide GPU and cache budget, with GPU texture transcoding
kind: work
state: planned
created: 2026-11-13
project: CS-194
needs: [CS-321]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/history/m2-progress.md`, "M2 close-out"; `docs/design/tile-selection-and-memory.md`, made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-321. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

One budget across tilesets, terrain, imagery and targets replaces each tileset's 512 + 512 MiB, with JPEG to BC7 or ASTC transcoding in workers as the largest memory lever for photogrammetry.

Detail: `docs/history/m2-progress.md`, "M2 close-out"; `docs/design/tile-selection-and-memory.md`.

## Note (2026-11-22)

The owner committed it before beta.1 (CS-1003 A): the content-source seam's `Want` gains CPU and GPU bytes and a reclaim path before beta.1, and sources move over by 2.0.0.

## Note (2026-11-23)

The owner (2026-11-23, CS-1115): the ledger's kinds, bytes by owner and kind, CPU and GPU, are part of this item's contract. The report call is CS-1121.
