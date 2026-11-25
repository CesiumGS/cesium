---
id: CS-1327
title: Label collision and fading as the runtime's GPU kernel
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-1325, CS-1326, CS-1206]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.12, its item RC), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: the owner chose collision as a runtime GPU kernel (Q4: "Yes, a runtime GPU kernel (Recommended)"). Size: large. Decider: owner. Filed 2026-11-24.

## Done when

- Label collision and fading run as an IR compute kernel the runtime plans with declared buffers, reading the candidates, the camera and the depth pyramid (viewer inputs, CS-1206), and writing per label: shown, opacity and the chosen candidate. 2.0 compiles it for WebGPU and runs it each tick.
- Overflow is counted and reported on `Engine.errors` (CS-1138).
- A label that straddles a tile edge is placed once, keyed by its feature's key, tested on a fixture.
- Every loop is bounded by a constant and every index clamped, and the Metal output is read before the first browser run.
