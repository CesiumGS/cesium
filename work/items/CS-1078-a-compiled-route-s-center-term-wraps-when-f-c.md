---
id: CS-1078
title: A compiled route's center term wraps when F(c) minus the eye passes 2³¹ units with both values under it
kind: work
state: proposed
created: 2026-11-22
project: CS-10
needs: [CS-921]
---

> **Proposal.** Source: CS-921's executor, round 2 (2026-11-22). Why: when F(c) and the eye are each under 2³¹ units but on opposite sides of the origin past 2³⁰ units (1.07 × 10⁹ m), the whole units of their difference wrap by 2³² units, and nothing guards it. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- The center term falls back to the float path when the eye is beyond 2³⁰ units, or the limit is documented and refused by name. The executor recommends the fallback.
- A readback case passes with F(c) and the eye 1.5 × 10⁹ m on either side of the origin, on both backends.
