---
id: CS-1328
title: The WebGL 2 CPU form of label collision, as runtime jobs
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-1327]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.13, its item RG), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: WebGL 2 has no compute, so collision there runs on the CPU (CS-1135). Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The CPU form of the collision kernel runs as runtime jobs, one tick behind, and agrees with the GPU kernel to a stated bound on a shared fixture.
