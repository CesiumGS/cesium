---
id: CS-296
title: "Black hole visualization: how much physics, and an engine feature or a gallery example?"
kind: decision
status: Planned
created: 2026-11-13
project: CS-192
decided-by: owner
---

## Question

The note's six open questions: a static camera and hole or a moving camera and spinning (Kerr) hole; whether the deflection map is good enough for the Moon beside a hole or near content needs ray tracing; whether a weak-field warp belongs in placement at all; Kerr's cost on integrated GPUs; the colour model (redshift, beaming, disk temperature); engine feature or gallery only. Source: `docs/design/black-hole-visualization.md`.

## Options and recommendation

The note recommends: the recurring part, a ray-marching pass shared with f-reps and volumes, is the engine's; the geodesics are the example's. Its order: weak-field warp, then a Schwarzschild per-pixel pass, then the deflection map, with Kerr later.

## Answer

Open.
