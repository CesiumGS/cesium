---
id: CS-1335
title: GeoJSON draped on terrain
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-661, CS-1334]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.8, its item VG), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: split from CS-661 so CS-661 can land flat; GeoJSON with no heights belongs on the terrain once vector draping exists. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- GeoJSON with no heights, or with a clamp option, loads with `clamp: "terrain"` and draws on the terrain through the vector draping item.
- Tested on a fixture over recorded terrain, with no outside service.
