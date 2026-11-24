---
id: CS-1224
title: Feature IDs at or above featureCount become NULL_FEATURE, and the shader clamps the row
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-969]
---

> **Proposal.** Source: CS-969's review (content worker limits and watchdog), relayed by orch-11 (2026-11-24). Why now: an out-of-range feature ID reads past the feature table today. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The worker maps any feature ID at or above `featureCount` to `NULL_FEATURE`, with a test.
- The shader clamps the feature row it reads, per the GPU safety rules, with a test.
