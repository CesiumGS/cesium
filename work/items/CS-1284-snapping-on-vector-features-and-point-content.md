---
id: CS-1284
title: Snapping on vector features and point content, stating the snap kind and how exact it is
kind: work
state: proposed
created: 2026-11-24
project: CS-193
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host's snapping tools must work on every content, not only tile triangles. CS-302 covers exact snapping on B-reps; CS-225 is the GPU snap pass. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Snapping works on vector features (vertices, segment points and segment midpoints) and on point content (the nearest point), beside today's snapping on tile triangles.
- Every snap result states its kind (vertex, edge, nearest point, surface) and how exact it is: exact source coordinates, or tessellated or quantized data with its error bound.
- A stated accuracy never claims more than the input supports.
- Tests cover each kind on each content type.
