---
id: CS-1356
title: Merge CS-810, the imagery and terrain provider seam
kind: decision
state: planned
created: 2026-11-25
project: CS-191
decider: owner
---

## Question

Merge CS-810 into main? The imagery and terrain provider seam carries any tiling scheme, renewable credentials and per-tile credits, with a public change: ImageryProvider.tilingScheme becomes an object (a major bump for @cesium/core and @cesium/next).

The imagery provider contract gains fetchTile(x, y, level, signal) beside tileUrl, tiling schemes from OGC tile matrix sets (Web Mercator or geographic, top-left origins; others refused with the reason), bounding-box requests, renewable credentials through CS-809's fetch and credential provider (Bing's key added as a credential at send time, never in a URL the engine builds), and per-tile credits; terrain gets its own provider contract (rows counted from the north, converted to TMS inside), with engine.addTerrain taking a TerrainProvider. ion's providers move to globe/ionImagery.ts inside core until CS-269. Public change: ImageryProvider.tilingScheme becomes a TilingScheme object (webMercator, geographic, fromTileMatrixSet) instead of a string, so the changeset marks @cesium/core and @cesium/next major, and 9 names join each entry (owner paths: the entries and api/surface.txt), as the done-when asks. An Opus review found no credential leak and Web Mercator texels unchanged bit for bit, and 4 Importants, all fixed in one round: a hung fetchTile held its request slot (now raced against the signal, with the result checked and counted); the public TileRange counted rows from the south (its availability listing is now internal and TileRange is gone from the surface); terrain providers' credits never reached the screen (now merged into the globe's); and the architecture tab's seam table had no row for this seam (added, with CS-809's). A scoped Opus check found nothing new. Its API questions (levelFor and the parent rule, TileMatrix's units, quantized-mesh availability on the generic interface, the heightmap variant) are on CS-102. Follow-ups filed: CS-1319 (a heightmap decoder) and CS-1320 (standard tile matrix sets as the built-in quadtree); one more is proposed: the shipped Viewer shows every provider's attributions. Merge order: io/worker.ts with CS-969 and CS-556; GlobeImagery with CS-145. Checked by the orchestrator on the replay 17db99b5b3 (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh. CS-279's providers and CS-555 can build on it, and alpha.1's wait on the adapters (CS-1296) shortens.
- B. B. Hold it: Nothing merges; providers stay on today's thin seam.

Recommended: A. Merge it. It meets the done-when, the credential boundary holds, and every review finding is fixed.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
