---
id: CS-668
title: 1.x's data formats load as modules
kind: milestone
state: planned
created: 2026-11-17
project: CS-191
outcome: CZML, KML, GPX, GeoJSON, other 3D Tiles servers, PostGIS, GeoParquet, voxels, point clouds and splats load through the content-source seam, and providers plug in through one interface.
constraints: [CS-658 c?, CS-659 c?, CS-660 c?, CS-661 c?, CS-662 c?, CS-663 c?, CS-664 c?, CS-666 c?, CS-279 c?, CS-339 c?, CS-276 c?, CS-277 c?, CS-991 c?, CS-992 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

From the owner's release planning on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`). Release: beta.1. Its items are constraints marked `c?` until shaping links each to a clause.

On 2026-11-24, CS-991 joined. It was planned outside every release, and the owner asked that no planned work sit outside the release chain.

## Note (2026-11-24, CS-992)

CS-992 (Dyno loads an outside module and benchmarks it as it does the built-in sources) moved here from CS-484 at the owner's word, beside CS-991, the outside-module path it benchmarks.
