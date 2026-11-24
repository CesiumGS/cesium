---
id: CS-1283
title: Vector features answer picks with their own stable IDs and properties, lines within a pixel tolerance
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-557, CS-661]
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: CS-557, CS-661 and CS-870 cover loading and styling vector features, not picking them. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- MVT, GeoJSON and feature-service content answer picks with the feature's own stable ID (as the source declares it) and its properties.
- Lines and points are picked within a tolerance in CSS pixels that the call sets, so a one-pixel line can be hit.
- Several features within the tolerance come back nearest first.
- Tests cover a polygon, a thin line and a point from each source.
