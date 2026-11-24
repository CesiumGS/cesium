---
id: CS-560
title: Content from any source loads through one module seam
kind: milestone
state: planned
created: 2026-11-16
project: CS-191
outcome: An application loads 3D Tiles, the globe's terrain and imagery, glTF files, MVT, Esri services and USD through one content-source interface, importing only the source modules it uses.
constraints: [CS-552 c?, CS-554 c?, CS-555 c?, CS-556 c?, CS-557 c?, CS-558 c?, CS-559 c?, CS-553 c?, CS-808 c?, CS-809 c?, CS-810 c?, CS-811 c?, CS-831 c?, CS-847 c?, CS-848 c?, CS-849 c?, CS-903 c?, CS-904 c?, CS-906 c?, CS-898 c?]
---

## Notes

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

CS-808 (the data-resource provider), CS-809 (the fetch and credential provider), CS-810 (the imagery and terrain provider seam) and CS-811 (2.0's own decoders) joined on 2026-11-21, on the owner's word in a review of 2.0's seams.

CS-831 (a design for editing back through the seams) joined on 2026-11-21, so the seam's write path is designed before it freezes.

CS-847 (the seam's core), CS-848 (render features, public from alpha.1) and CS-849 (streams for push sources) joined on 2026-11-21, from CS-552's plan.
