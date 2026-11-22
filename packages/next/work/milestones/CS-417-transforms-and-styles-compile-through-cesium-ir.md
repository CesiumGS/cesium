---
id: CS-417
title: Transforms and styles compile through Cesium IR
kind: milestone
state: planned
created: 2026-11-14
project: CS-10
outcome: "Styles, transforms and routes are Cesium IR programs that evaluate in float64 on the CPU and emit both WGSL and GLSL ES, with the same results as today."
constraints: [CS-48 c?, CS-49 c?, CS-50 c?, CS-51 c?, CS-52 c?, CS-53 c?, CS-54 c?, CS-55 c?, CS-56 c?, CS-371 c?, CS-39 c?, CS-837 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Migrated on 2026-11-14 from the milestone "core" of CS-10 (its `milestones` list and its items' `milestone` key). Its 9 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 from "Core" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.

CS-371 joined this milestone on 2026-11-15, on the owner's answer: the math ops the transform graph needs.

CS-39 joined from CS-416 on 2026-11-18 (owner, 2026-11-18, fixing the release crossings CS-685 found).

CS-837 (the IR's JSON format is experimental at 0.x) joined on 2026-11-21, from the owner's answer to CS-836.
