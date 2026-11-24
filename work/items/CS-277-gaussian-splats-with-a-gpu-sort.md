---
id: CS-277
title: Gaussian splats with a GPU sort
kind: work
state: planned
created: 2026-11-13
project: CS-191
needs: [CS-275, CS-552, CS-848]
tier_override: 1
---

## Done when

Splat tiles draw, sorted on the GPU through the shared translucency compositor, and the catalog's `campus-splats` scene runs.

Added 2026-11-24 from a host application's need, which the owner moved up (tier 1, after CS-848):

- 3D Tiles whose content is `KHR_gaussian_splatting` with SPZ compression load through the content-source seam, like other tiles, including a tileset resolved from Cesium ion.
- Splats draw as a render feature registered through CS-848, in its `translucent` slot, depth-tested against other content in the scene.

Detail: `docs/history/m5-and-m6.md`; `docs/design/architecture.md`.
