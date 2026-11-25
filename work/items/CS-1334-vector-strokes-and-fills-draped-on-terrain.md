---
id: CS-1334
title: Vector strokes and fills draped on terrain, through CS-654's chosen mechanism
kind: work
state: planned
created: 2026-11-24
project: CS-190
needs: [CS-654, CS-261]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.7, its item VM), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: the owner chose no interim draping (Q1, "B: wait for CS-654"), so draped strokes and fills wait for CS-654's mechanism and are built on it here. CS-654's plan may file this item instead; if it does, this one merges into it. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Strokes and fills with `clamp: "terrain"` draw on the terrain through the mechanism CS-654 chooses, from the coverage functions the design's section 6 hands it. `clamp: "all"` follows when that mechanism reaches tilesets and models.
- CS-261's "not drawn yet" branch and its report go.
- A pick on a draped mark returns the feature's stable ID.
- A Dyno measurement of an in-memory layer the size of a city's streets and blocks, draped on terrain, with run IDs cited.
- The handbook's vector tab says what's built.

## Notes

Planned by the owner on 2026-11-24 ("Plan CS-1334"). It is on alpha.1's path: CS-557 (MVT) needs it, and CS-560 needs CS-557. It starts once CS-654 (the surface-projection design) has chosen the draping mechanism.
