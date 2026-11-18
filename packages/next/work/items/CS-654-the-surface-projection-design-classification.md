---
id: CS-654
title: "The surface-projection design: classification, draping and decals"
kind: work
state: planned
created: 2026-11-17
project: CS-190
needs: [CS-258]
---

## Done when

- A reviewed design projects vector features, imagery and volumes onto terrain, tilesets and models through one target mask that generalizes 1.x's `ClassificationType`, with an inverted mode, and joins the translucency compositor.
- It chooses the mechanism (compute decals from depth and normals, per-pixel lists, texture-space projection for imagery) from measurements.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
