---
id: CS-1125
title: "An optional ray model for physical cameras: sensor area, thin lens, distortion and fisheye, used by ray-traced products"
kind: work
state: planned
created: 2026-11-23
project: CS-197
needs: [CS-1122]
---

> **Committed by the owner (2026-11-23), through CS-1122 A.** No release yet.

## Done when

- A camera may carry a ray model that maps a pixel and a sample to a ray: a sensor with real area, a thin lens with an aperture and focus distance, lens distortion, or a fisheye.
- Ray-traced products (the path tracer and ray queries) use it. Raster views keep the projective matrix and render these effects as post stages, such as depth-of-field blur or a distortion warp.
- The default ray model is the matrix's own pinhole rays.
