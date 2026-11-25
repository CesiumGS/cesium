---
id: CS-1337
title: Legacy 3D Tiles 1.0 vector and geometry tiles (vctr, geom) through the vector path
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-261, CS-554]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.18, its item VX), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: the release plan puts glTF and 3D Tiles at 1.x's coverage in beta.1, and 1.x draws 3D Tiles 1.0 `vctr` and `geom` tiles; parity.md lists them as unsupported with no milestone. Whether they belong at beta.1 or are left to 1.x's upgrade path is the owner's call. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- `vctr` and `geom` tiles decode into the vector path's records, and `io/composite.ts` stops skipping them.
- A fixture of each draws, and picks return stable IDs.
- parity.md names the milestone they land in.
