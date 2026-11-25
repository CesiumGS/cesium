---
id: CS-261
title: Wide lines, polygons and decals, with vector sources and vector tiles
kind: work
state: planned
created: 2026-11-13
project: CS-190
needs: [CS-258]
---

## Done when

Wide lines, polygons and draped decals, vector tiles (`3DTILES_content_gltf_vector`) and vector sources, with the point cull refactored so one kernel interface serves every kind.

Detail: `docs/design/transforms-and-instancing.md`, "Billboards, points and decals".

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

The owner, 2026-11-17: draped decals join one surface-projection design with classification and draping (CS-654); this item keeps wide lines, polygons and vector tiles.

2026-11-24, the owner (Q5, "A: split it out"): `3DTILES_content_gltf_vector` moves to its own item (CS-1331); this item draws vector sources and vector features without it. Draped strokes and fills are CS-1334; dashes and casing CS-1329; image marks CS-1330; the render-feature slots CS-1332. From CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 4, on CS-258's branch until it merges).
