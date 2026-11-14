---
id: CS-314
title: One GPU tessellation engine for reprojected models, B-reps and meshes under smooth routes
kind: work
status: Proposed
created: 2026-11-13
project: CS-193
---

## Done when

Patches and the draw's placement evaluated together in compute, subdivided by screen-space error with crack-free edges, for reprojected models and B-reps; ordinary meshes under a smooth route get an H-based chord bound and a subdivision pass (today a spike, `spikes/routeTessellation.ts`).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, sections 3 and 8; `docs/superpowers/plans/2026-11-12-transform-graph.md`, Task 5.
