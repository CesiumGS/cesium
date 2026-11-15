---
id: CS-431
title: The camera chain's layers checked against what each may know
kind: work
status: Planned
created: 2026-11-14
project: CS-437
needs: [CS-101]
---

## Done when

Each layer of the camera chain has its public surface checked against what it may know, using the surface map (CS-101's protocol table and `api/surface.txt`): the GPU renderer and the scene core name no reference frame, the animation core no `Instant`, and the application no render root. Each breach is listed with a proposed move for the review (CS-102).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, sections 7.2 and 15.2.
