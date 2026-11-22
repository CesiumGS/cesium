---
id: CS-854
title: GPU rays hit Gaussian splats through an acceleration structure over ellipsoids
kind: work
state: proposed
created: 2026-11-21
project: CS-197
touches: [packages/next/src/query/**, packages/next/src/render/features/**, packages/next/test]
---

CS-832's design settles that a pick in Gaussian splats names the splat where accumulated opacity first reaches 0.5. GPU ray queries (CS-535) then need an acceleration structure over splats as ellipsoids, so that rays and picks agree.

Source: CS-832's report, relayed by orch-11, 2026-11-21. Why now: it's recorded so CS-535's ray seam leaves room for non-triangle primitives. Rough size: medium. Decider: the owner, when committing it. Filed: 2026-11-21.

## Done when

- A ray query against splat content returns the same splat as a pick at that pixel, by CS-832's rule, through an acceleration structure built over ellipsoids.
- It goes through the ray-query seam (`test/seams.test.ts`), and its loops are bounded by constants, per AGENTS.md's GPU safety rules.
