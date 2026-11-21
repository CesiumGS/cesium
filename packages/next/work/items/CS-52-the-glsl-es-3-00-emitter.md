---
id: CS-52
title: The GLSL ES 3.00 emitter
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
needs: [CS-51]
claimed_by: orch-11-CS-52
touches: [packages/next/src/ir/**]
---

The GLSL ES 3.00 emitter. Needs CS-51.

## Done when

- Every program in CS-51's tests compiles and links in a WebGL 2 context in the browser suite.
- The GPU readback test passes on WebGL 2 with the same tolerances as CS-51.
- naga's GLSL ES output for one emitted WGSL module per test is compiled beside it, as a cross-check.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
