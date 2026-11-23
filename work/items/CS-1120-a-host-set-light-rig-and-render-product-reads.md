---
id: CS-1120
title: A host-set light rig and render-product reads for looks, so a host builds its own CAD lighting
kind: work
state: planned
created: 2026-11-23
project: CS-191
needs: [CS-1113]
---

> **Committed by the owner (2026-11-23).** Source: the general-primitives review of a CAD or BIM host application's needs (2026-11-23), in the chief of staff's notes. Generic: a host application builds its own features on this primitive. Through CS-1113 A.

## Done when

- First, check what the light list and environment already allow, including whether a light can follow the camera, and say so.
- A host can set its own lights, camera-relative included, and a post stage can read the products a look needs (normals, depth, IDs). The world stays physical.
- A CAD-lighting look is shown in an example, built only on these.
