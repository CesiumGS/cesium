---
id: CS-558
title: Esri services load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-555, CS-557]
touches: [packages/next/src/**]
---


Esri services load as sources through the seam, for example feature, tile and I3S scene services; which ones, and in what order, is for CS-552's plan.

## Done when

In the design's order: map and tile services, feature services, I3S scene layers, elevation.

- Map and tile services load as imagery through CS-810's contract, tiled and by box (`export`).
- Feature services load as features by extent, paged and quantized, into `FeatureSink`, with the service's fields as the schema. The write capability is declared from the service's own, and stays read-only until CS-831's writers.
- I3S scene layers load as a `tree` source on the kit: node pages, geometry buffers, Draco and attribute buffers.
- Elevation services load as a terrain kind, with a LERC decoder from CS-811.
- Each is tested on recorded responses, with no outside service.
- This is large. The main session may split I3S and elevation into items of their own (a question below).

## Note (2026-11-23)

`docs/design/styling-runtime.md` (section 13): a feature service's fields bind as feature-rate inputs through its schema, and an elevation service becomes a provider of the terrain-height input. Service-defined symbology, if wanted, is a front end. The scope here is unchanged.
