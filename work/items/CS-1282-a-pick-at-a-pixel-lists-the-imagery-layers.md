---
id: CS-1282
title: "The imagery provider seam's tiling-scheme math is public: a position to a layer's tile and pixel"
kind: work
state: proposed
created: 2026-11-24
project: CS-193
needs: [CS-810]
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host asks each imagery layer's own service what is at a point (for example a feature-info request), so it needs each layer's tile and pixel at a point. The host knows its layers and their order; the engine owns the tiling-scheme math. Narrowed on 2026-11-24 with the owner's yes: which layers to ask, and asking them, is the host's work. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- CS-810's tiling schemes are public: from a longitude and latitude (with the datum named), a host gets a layer's tile (level, column, row in the layer's own scheme) and the pixel within that tile.
- A host can read a view's imagery layers in draw order, top first, with each one's tiling scheme and level at a position.
- The engine doesn't call any layer's service.
- Tests cover two layers with different tiling schemes at the same position, and `npm run surface` shows the new exports.
