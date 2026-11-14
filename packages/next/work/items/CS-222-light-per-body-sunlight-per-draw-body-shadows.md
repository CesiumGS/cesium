---
id: CS-222
title: "Light per body: sunlight per draw, body shadows, earthshine and the Moon's reflectance"
kind: work
status: Planned
created: 2026-11-13
project: CS-188
milestone: 5e sky and light per body
needs: [CS-207]
---

## Done when

Each draw is lit from its own body (Moon content by the unfiltered sun); eclipses fall out of analytic body shadows; earthshine lights the Moon; one Hapke material with its opposition surge (Lommel-Seeliger if Hapke's parameters can't be sourced) is shared by the impostor and Cesium Moon, so the handover doesn't jump in brightness. Stars and the sun turn with the render root from any body.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 12.2.
