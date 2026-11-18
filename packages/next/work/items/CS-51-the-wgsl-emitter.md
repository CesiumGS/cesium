---
id: CS-51
title: The WGSL emitter
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
needs: [CS-48, CS-570]
claimed_by: D-23
touches: [packages/next/src/ir/**]
---

The WGSL emitter. Needs CS-48.

## Done when

- Emitted WGSL for every test program is accepted by naga (CI) and by Chrome (the browser suite).
- A GPU readback of each op over its edge cases agrees with the float64 evaluator to a stated float32 tolerance per op. The test writes the tolerances down.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
