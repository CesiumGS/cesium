---
id: CS-1336
title: B-rep edges and sections on the stroke path
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-260, CS-309]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.17, its item VE), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: B-rep edges and sections belong on the shared stroke path, in CS-260's same-feature depth mode; splitting them from CS-309 lets its trims land without waiting on CS-260. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- B-rep edges and sections become stroke records of quadratic pieces, refined per view in the cull, in CS-260's same-feature depth mode.
- Snaps and measurements still answer from the exact source.
- A Dyno lab case shows a B-rep's edges at a silhouette and on a shared edge, against the previous commit.
