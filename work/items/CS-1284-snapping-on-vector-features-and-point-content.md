---
id: CS-1284
title: "Content gives a feature's source geometry by ID, with how exact it is"
kind: work
state: proposed
created: 2026-11-24
project: CS-193
needs: [CS-1283]
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host's snapping tools must work on vector features and point content, not only tile triangles. Narrowed on 2026-11-24 with the owner's yes: snap kinds, priority, tolerance and lock-on are the host tool's policy; the engine gives located features and their geometry. CS-302 covers exact snapping on B-reps; CS-225 is the GPU snap pass. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- Vector and point content give a feature's source geometry by its ID (as CS-1283's picks return it): vertices and segments for vector features, and the point for point content, in a stated coordinate system and datum.
- Each answer states how exact it is: exact source coordinates, or tessellated or quantized data with its error bound. A stated accuracy never claims more than the input supports.
- Content that can't give source geometry says so through CS-1285's declarations, never with an empty answer.
- Tests cover each content type, and one that refuses.
