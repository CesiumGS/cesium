---
id: CS-933
title: Ray casts are watertight at the shared edge of two draws
kind: work
state: proposed
created: 2026-11-22
project: CS-197
---

> **Proposal.** Source: CS-815's report (2026-11-22). Why: ray casts fall through the shared edge of two draws, because the Möller–Trumbore test in `raycast.slang` isn't watertight. 8 of 24 edge rays hit the ground behind. Picks and measurements along edges can return the wrong thing. Size: medium. Decider: owner. Filed 2026-11-22.

## Done when

- The ray-triangle test is watertight: no ray through a shared edge or vertex of two triangles misses both. Cite the method used, for example Woop, Benthin and Wald's watertight test.
- The 24 edge rays from CS-815's test hit the draws, not the ground behind.
- Every ray's distance may change, so the parity suites run against the previous commit and a base, with separate checkouts, and every difference is explained.
