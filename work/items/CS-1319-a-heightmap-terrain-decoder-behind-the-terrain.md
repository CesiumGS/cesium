---
id: CS-1319
title: A heightmap terrain decoder behind the terrain seam, so OGC API Coverages and other grid-of-heights providers draw
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-810]
---

> **Proposal.** Source: CS-810's report (the imagery and terrain provider seam carries any tiling scheme, renewable credentials and per-tile credits), relayed by orch-11 on 2026-11-24. Why now: the provider contract has heightmap tiles, but `TerrainSource` refuses them until a decoder exists, so OGC API Coverages and other providers of grids of heights can't draw. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A heightmap decoder runs as a job type behind the terrain seam, and turns a grid of heights (its size, its tile's extent, its height scale and offset, its no-data value) into terrain meshes with skirts, as quantized mesh does.
- `TerrainSource` accepts heightmap tiles through it, instead of refusing them.
- Tests decode a small grid in Node and check heights at known points, edges shared with the neighbors, and no-data handling.
- The handbook tab that lists terrain formats names heightmaps.
