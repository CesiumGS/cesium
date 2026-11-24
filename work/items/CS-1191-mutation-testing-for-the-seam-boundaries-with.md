---
id: CS-1191
title: Mutation testing for the seam boundaries with StrykerJS and fast-check
kind: work
state: proposed
created: 2026-11-23
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: CS-847's step back (2026-11-24), which found the oracles test instances, not classes. Why: mutation testing shows whether the I1 to I3 tests catch a weakened boundary, and property tests generate forged inputs instead of hand-picked ones. Cost: two new dev dependencies, StrykerJS and fast-check, which are the owner's call. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- The owner agrees to the two dev dependencies.
- fast-check properties drive forged inputs through every CS-1188 inlet.
- A StrykerJS run on the boundary module shows the surviving mutants, and each one is killed or explained.
