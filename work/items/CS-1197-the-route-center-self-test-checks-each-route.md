---
id: CS-1197
title: The route-center self-test checks each route kind on its first GPU use, not one fixed case
kind: work
state: proposed
created: 2026-11-23
project: CS-10
needs: [CS-955]
touches: [packages/core/src/scene/world/**, packages/core/src/gpu/**, packages/core/src/profile/**, test/**]
---

> **Proposal.** Source: the Opus GPU review of CS-955 and its report, relayed by orch-11 with the merge decision CS-1196 (2026-11-24). Why: the self-test runs one fixed case (a geographic-to-geocentric route), and one case can't vouch for another route kind: on the Apple M2, `flatten` was off by up to 184 m while the fixed case was off by 0.75 m. Must land before any device takes the GPU path, and before CS-161. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- The first GPU use of each route kind checks that kind's records against the CPU's float64 ones, and only a kind that passes takes the GPU path on that device.
- A failing kind keeps the CPU path and the device report names it.
- A test shows one kind passing and another failing on the same device, with the right path for each.
