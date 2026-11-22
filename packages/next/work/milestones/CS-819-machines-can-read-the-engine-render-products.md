---
id: CS-819
title: "Machines can read the engine: render products, camera records, stable identity and explicit stepping"
kind: milestone
state: planned
created: 2026-11-21
project: CS-437
outcome: A simulator, a synthetic-data pipeline or a world model drives the engine step by step and reads back depth, normals, motion and IDs, with each frame's camera record and stable, labeled identity.
constraints: [CS-813 c?, CS-814 c?, CS-815 c?, CS-816 c?]
---

## Done when

To shape: clauses (c1, c2…), one per seam, and the independent check, a script that steps a scene and reads back depth and IDs with the camera record.

## Notes

From the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice. In alpha.1. The modules on top of it are proposed as CS-817. CS-452 (semantic metadata) and CS-802 (SimReady) are open decisions that CS-815 builds on.
