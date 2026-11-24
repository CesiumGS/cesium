---
id: CS-1315
title: View.pickDetail and View.pick answer through pickRenderFeatures
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-121, CS-202]
---

> **Proposal.** Source: CS-848's report (render features: passes in named slots, declared for picks, rays and shadows), which came back partial, relayed by orch-11 on 2026-11-24. Why now: CS-848 added pickRenderFeatures, but View.pick and View.pickDetail don't answer through it yet. View.ts is in flight with CS-121 and CS-202, so this waits for both. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- View.pick and View.pickDetail answer through pickRenderFeatures, so a render feature's picks reach callers of the View.
- Picks on splats keep the accumulated-opacity rule from CS-848.
- Tests cover a pick that lands on a render feature and one that falls through to other content.
