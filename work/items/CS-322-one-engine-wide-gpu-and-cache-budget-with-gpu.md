---
id: CS-322
title: One engine-wide GPU and cache budget, with GPU texture transcoding
kind: work
state: proposed
created: 2026-11-13
project: CS-194
needs: [CS-321]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/history/m2-progress.md`, "M2 close-out"; `docs/design/tile-selection-and-memory.md`, made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-321. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

One budget across tilesets, terrain, imagery and targets replaces each tileset's 512 + 512 MiB, with JPEG to BC7 or ASTC transcoding in workers as the largest memory lever for photogrammetry.

Detail: `docs/history/m2-progress.md`, "M2 close-out"; `docs/design/tile-selection-and-memory.md`.
