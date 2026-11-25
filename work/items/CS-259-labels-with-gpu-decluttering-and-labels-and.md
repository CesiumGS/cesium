---
id: CS-259
title: Labels with GPU decluttering, and labels and pins drawn in the engine
kind: work
state: planned
created: 2026-11-13
project: CS-190
needs: [CS-258, CS-261, CS-1326, CS-1327, CS-1333]
---

## Done when

Labels draw in the engine with a decluttering pass, clamped where asked, replacing HTML overlays for labels and pins: the real-time tracks milestone's increment 5.

Detail: `docs/history/real-time-tracks-milestone.md`; `docs/design/real-time-tracks.md`.

2026-11-24, from CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 4, on CS-258's branch until it merges): labels wait on the styling runtime (the owner, Q2), so this item needs text shaping (CS-1326), collision as a runtime kernel (CS-1327) and the glyph spike's choice (CS-1333), as well as the stroke and fill path (CS-261). Pins with images move to CS-1330, which needs no shaping and can land first.
