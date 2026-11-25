---
id: CS-1320
title: Recognize a tile matrix set equal to WebMercatorQuad or WorldCRS84Quad as the built-in quadtree
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-810]
---

> **Proposal.** Source: CS-810's report (the imagery and terrain provider seam carries any tiling scheme, renewable credentials and per-tile credits), relayed by orch-11 on 2026-11-24. Why now: a provider that describes its tiles by an OGC tile matrix set gets the general tiling path, even when the set is the built-in quadtree, so content such as city lights and terrain misses the quadtree's fast path. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A tile matrix set equal to WebMercatorQuad or WorldCRS84Quad (by its CRS, its top-left corner, its matrix sizes and scales, within a stated tolerance) is recognized as the built-in quadtree it matches.
- A set that differs in any of these stays on the general path.
- Tests cover both well-known sets, written out in full and by their URI, and a near miss that isn't recognized.
