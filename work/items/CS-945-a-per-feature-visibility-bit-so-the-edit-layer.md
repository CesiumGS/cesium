---
id: CS-945
title: A per-feature visibility bit, so the edit layer can hide one feature in a batched tile draw, and draw replaced or inserted features
kind: work
state: proposed
created: 2026-11-22
project: CS-191
needs: [CS-847]
---

> **Proposal.** Source: CS-847's report (2026-11-22). Why: CS-831's editing design needs it once the seam's core lands. Size: medium. Decider: owner. Filed 2026-11-22.

## Done when

- A per-feature visibility bit lets the edit layer hide one feature inside a batched tile draw, without rebuilding the draw.
- Replaced or inserted features draw in its place, picked by their own stable IDs.
- Tests hide, replace and insert a feature in a batched tile.
