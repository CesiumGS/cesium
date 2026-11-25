---
id: CS-1341
title: "df64 log, mul and div above 4.5 × 10³⁴: the Veltkamp split's 4097·x overflows float32"
kind: work
state: proposed
created: 2026-11-24
project: CS-10
---

> **Proposal.** Source: CS-371's fix round (math ops the transform graph needs), relayed by orch-11 on 2026-11-24. Why now: above 4.5 × 10³⁴, the Veltkamp split's 4097·x overflows float32, so `df_log` returns NaN and `df_mul` and `df_div` fail the same way. The fault predates CS-371. Fixing it changes every df64 route's emitted text, so it needs its own golden update rather than riding in CS-371. Size: small, plus the golden update. Decider: owner. Filed 2026-11-24.

## Done when

- The df64 split no longer overflows: `df_log`, `df_mul` and `df_div` give finite results up to the largest finite float32, by prescaling or another split. The commit names the method.
- Tests in float32 cover inputs on both sides of 4.5 × 10³⁴, and the largest finite float32, for each of the three, checked against a float64 reference with the error stated.
- The goldens for every df64 route are updated in one deliberate commit, and the Metal output of a changed kernel is read with `scripts/dumpMsl.mjs` before its first browser run.
- Related, not the same fault: CS-1199 (flatten's df64 route-center pass off by up to 184 m on Apple GPUs) works at Earth-scale values, far below this range.
