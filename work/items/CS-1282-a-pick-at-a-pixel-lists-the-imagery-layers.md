---
id: CS-1282
title: A pick at a pixel lists the imagery layers composited there, top first, with each layer's tile and pixel
kind: work
state: proposed
created: 2026-11-24
project: CS-193
needs: [CS-810]
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host asks each imagery layer's own service what is at a point (for example a feature-info request), so it needs to know which layers drew there. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A pick at a pixel can list the raster imagery layers composited there, top first, including layers hidden under opaque ones only if the call asks for them.
- Each entry names the layer, its tile (level, column, row in the layer's own tiling scheme, from CS-810) and the pixel within that tile.
- The engine doesn't call the layer's service; the host does.
- Fake-engine tests cover two overlapping layers with different tiling schemes.
