---
id: CS-443
title: "Small engine fixes: height lost in cartesianToCartographic, clip tests for tile load and slot reuse, the snap run reset on a server error"
kind: work
status: Planned
created: 2026-11-14
project: CS-189
---

## Done when

`Ellipsoid.cartesianToCartographic` keeps height near the equator (it loses about 0.3 micrometres today); tile load, unload and slot reuse have clip tests; and a thrown server error resets the snap run. (The design globe's opaque-switch line and rigid normals are CS-252's.)

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 5a", "Smaller engine items".
