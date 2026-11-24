---
id: CS-1192
title: "Seam tests: a forced collision in T3, and a samples variant T2 can fail"
kind: work
state: proposed
created: 2026-11-23
project: CS-191
needs: [CS-847]
---

> **Proposal.** Source: CS-847's round reviews (2026-11-24). Why: T3 never forces a key collision, and T2 has no samples variant it can fail, so both can pass while the property they name is broken. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- T3 forces a collision and shows the seam keeps the two entries apart.
- T2 gains a samples variant, with a mutation that makes it fail.
