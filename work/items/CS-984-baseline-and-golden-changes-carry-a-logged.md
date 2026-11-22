---
id: CS-984
title: Baseline and golden changes carry a logged reason, and every merge decision lists them (CS-980 A)
kind: work
state: planned
created: 2026-11-22
project: CS-199
needs: [CS-980]
---

> **Committed by the owner (2026-11-22), through CS-980 A.** Source: the Fable evidence review (`fable-review-evidence.md`).

## Done when

- Approving an image baseline or regenerating a golden records who did it and why, beside the change.
- Every merge decision lists the baselines and goldens its change touched, with their reasons. A check refuses a change that alters one with no reason recorded.
