---
id: CS-1307
title: No cracks between subdivision patches of different depths on the GPU
kind: work
state: proposed
created: 2026-11-24
project: CS-193
needs: [CS-1242]
---

> **Proposal.** Source: CS-577's report (the subdivision surfaces spike), relayed by orch-11's report audit (2026-11-24). Why now: each face is diced on its own on the GPU, so patches of different depths leave T-junction cracks. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Patches of different depths meet without cracks on the GPU.
- A test with neighboring patches at different depths finds no gaps.
