---
id: CS-1323
title: "Frames: which built-in curvilinear maps state exact accuracy?"
kind: decision
state: done
created: 2026-11-24
project: CS-196
needs: [CS-1322]
decider: owner
---

> **Decision for the owner, answered.** Source: CS-1022's review (a missing accuracy reads as unstated), relayed by orch-11 (2026-11-24). Asked after CS-1322's answer, under its rule. Filed 2026-11-24.

## Question

CS-1022 marks every built-in curvilinear map as exact (0 m). Three model measured things: `velocityModel` (seismic time to depth), `radialDistortion`, and a fitted lattice. `heightOffset` used as a datum shift is measured too, and has no way to state a sigma. Projections, conversions and display deformations stay 0 m either way, since their float error is precision, not accuracy. Which built-ins state exact?

## Options and recommendation

- Per descriptor (recommended by the reviewer): mark exactness per descriptor; the three measured models are unstated unless the host gives a sigma, and `heightOffset` gains an optional accuracy.
- Every built-in exact, with documentation that measured inputs need a stated sigma.

## Answer

The owner, 2026-11-24: "Per descriptor (Recommended)". Exactness is marked per descriptor. `velocityModel`, `radialDistortion` and a fitted lattice read as unstated unless the host gives a sigma, and `heightOffset` gains an optional accuracy. Projections, conversions and display deformations state 0 m.
