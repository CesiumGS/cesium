---
id: CS-645
title: "The generators: box, ellipsoid, cylinder, frustum, wall, corridor, extruded polygon, polyline volume, rectangle, ellipse and outlines"
kind: work
state: planned
created: 2026-11-17
project: CS-642
needs: [CS-644, CS-643]
---

## Done when

- Each generator returns `MeshData` for `addMesh`, follows the ellipsoid, subdivides by edge type, runs on workers, and matches 1.x's output on reference shapes within a stated tolerance.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
