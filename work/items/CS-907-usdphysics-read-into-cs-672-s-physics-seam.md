---
id: CS-907
title: UsdPhysics read into CS-672's physics seam
kind: work
state: planned
created: 2026-11-22
project: CS-193
needs: [CS-672, CS-901]
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). It is the "plus physics" in that answer.

## Done when

- UsdPhysics reaches CS-672's physics seam as the asset declares it: rigid bodies, mass, colliders, physics materials, and joints with their drives.
- CS-672's seam takes physics in, not only hands it out.
- Tests use the six samples. Five of them carry physics, and one has revolute joints with drives.
