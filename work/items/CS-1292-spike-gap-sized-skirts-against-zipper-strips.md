---
id: CS-1292
title: "Spike: gap-sized skirts against zipper strips for terrain cracks, measured"
kind: work
state: planned
created: 2026-11-24
project: CS-17
---

> **Committed by the owner (2026-11-24).** Source: CS-166 (the ×10 cliff bands are shadows of terrain skirts). Asked which skirt fix to build, the owner said: "let's do a spike on this, i want to understand the performance, shadow robustness, and memory tradeoffs (among other things) between gap-sized skirts and zipper strips". Filed 2026-11-24.

## Why

A skirt hangs 5 × its level's geometric error below every edge (`packages/core/src/globe/TerrainSource.ts`), because a tile doesn't know its neighbors when it is decoded. The exaggeration lift deepens that too, so at ×10 a skirt hangs ten times as deep, just under a steep wall and inside the caster bias, and casts bands. Most of the curtain fills no crack: same-level neighbors share their edges. CS-166's runs: taking skirts out of the casters removes the bands and changes 0.30% of pixels at ×1, but at ×4 sunlight seems to come through a crack.

Outside: CesiumJS 1.x has the same bands, still open (issue 11459, PR 11460). Mapbox GL JS terrain doesn't cast shadows. No engine was found that sizes skirts from the neighbor actually drawn.

## The two candidates

Both start from the same neighbor lookup: when the drawn set changes, each drawn tile's neighbor across each edge is found by quadtree address.

- **Gap-sized skirts.** An edge's skirt depth is the largest drop from this tile's edge polyline to the neighbor's. Both are polylines, so the maximum is exact at their vertices. Matching edges get no skirt. An edge with no known drawn neighbor keeps today's bound. Four depths per draw go through the per-draw constants seam, and the exaggeration lift deepens each skirt exactly as much as its crack.
- **Zipper strips.** No skirts. Each edge whose neighbors differ gets a strip that joins the two edge polylines vertex to vertex (Ulrich's "ribbon", kept to the crack). Strips are built on the CPU when a neighbor changes, held in a pool, drawn through the geometry submission seam, with imagery UVs and picking, and follow both tiles' morphs.

Moving the finer edge's vertices onto the coarser edge, as CDLOD does, is out: quantized-mesh tiles aren't nested, so the coarser edge's own vertices leave gaps.

## Done when

- Both candidates are built behind a development knob, in the pattern of CS-166's `tune.shadow` settings, with today's skirts as the baseline.
- Dyno runs on CS-166's Zermatt scenes at ×1, ×4 and ×10 compare each candidate with today and with each other:
  - Shadow robustness: the cliff bands; light through cracks, found by a check rather than only by eye; during level changes and morphs; at the edge of the caster set, where a neighbor isn't known; and while tiles load.
  - Performance: CPU time per change of the drawn set (lookup, gap or strip build), GPU time in the color and shadow passes, and draw counts.
  - Memory: bytes per tile and in the pool, and the peak during a fast camera flight.
  - Among the other things: overdraw and visible skirts in the color pass, the translucent globe, picking along cracks, imagery on strips, T-junction pinholes, and the seams and files each one touches.
- A spike page states the data, the settings, the costs, the A/B comparison and the question it asks, with a recommendation.
- The decision item that needs this spike gets its options and recommendation from the findings.
- Until CS-166 merges, the spike builds on its branch (`hitld/CS-166-cliff-band-acne`), which has the tuning knobs, the cascade view and the example settle fix.
