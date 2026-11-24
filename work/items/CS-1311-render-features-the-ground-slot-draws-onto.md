---
id: CS-1311
title: "Render features: the ground slot draws onto receivers"
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-555]
---

> **Proposal.** Source: CS-848's report (render features: passes in named slots, declared for picks, rays and shadows), which came back partial, relayed by orch-11 on 2026-11-24. Why now: CS-848 added the ground slot, but it refuses passes; CS-555 moves the globe's terrain and imagery onto the content-source seam, which gives the slot its receivers. Related: CS-654 (the surface-projection design: classification, draping and decals). Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A render feature can register a pass in the ground slot, and the slot draws it onto the receivers (terrain, and other content that declares itself a receiver), instead of refusing it.
- Picks, rays and shadows for a ground-slot feature follow its declarations, as in the slots CS-848 finished.
- Tests on the fake device cover a ground-slot feature drawn onto terrain and refused on a content that doesn't receive.
- The handbook tab that describes render features says the ground slot works.
