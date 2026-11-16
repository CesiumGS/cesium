---
id: CS-551
title: Does content from every kind of source, the globe included, load through one module seam built now?
kind: decision
state: planned
created: 2026-11-16
project: CS-191
decider: owner
---

## Question

Does content from every kind of source load through one module seam, built now rather than when a second consumer appears? The sources the owner named: 3D Tiles, MVT, Esri services, glTF files, USD and others, and the globe's terrain and imagery among them.

The owner made this call in their own words on 2026-11-16, and it's recorded in `docs/decisions/2026-11-16-content-sources-as-modules.md`. This item puts it in the tracker, so the seam's design (CS-552) and each source's work can need it. It supersedes the order in `docs/design/modular-renderer.md` (one package until a second consumer, split only after a bundle measure).

Rule basis: owner direction. Reversibility: two-way, but costly to undo once source modules depend on the seam.

## Options and recommendation

- A. Build the seam now, the globe among the sources: one content-source interface designed and planned first (CS-552), then each source moved or added behind it. The bundle measure stays as a baseline (CS-553). (cost: A design item at tier 3, then one item per source.)
- B. Keep the earlier order: one package until a second consumer exists, and split only if the bundle measure shows a cost. (cost: Nothing now; later sources inherit 3D Tiles' assumptions.)

Recommended: A, as the owner directed.

## Answer

Open.
