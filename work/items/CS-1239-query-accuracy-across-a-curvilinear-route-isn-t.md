---
id: CS-1239
title: Query accuracy across a curvilinear route isn't scaled by the route's stretch at the hit
kind: work
state: proposed
created: 2026-11-24
project: CS-8
needs: [CS-365]
---

> **Proposal.** Source: CS-365's review (limit-forced accuracy changes carried into query results), relayed by orch-11 (2026-11-24). Why now: both `accuracy.meters` and `accuracy.limited.meters` may state more accuracy than a stretched route supports (`frameRays.ts`, lines 199 to 211). It is inherited from `meters`. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- Both accuracy figures are scaled by the route's stretch at the hit, with a test on a route that stretches.
