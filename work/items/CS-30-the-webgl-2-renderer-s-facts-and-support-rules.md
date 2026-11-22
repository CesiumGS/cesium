---
id: CS-30
title: The WebGL 2 renderer's facts and support rules
kind: work
state: planned
created: 2026-11-13
project: CS-8
needs: [CS-21, CS-35]
touches: [packages/next/src/profile/**, packages/next/src/render/webgl2/**]
---

The WebGL 2 renderer's facts and support rules. Needs CS-21 and WebGL 2 CS-35.

## Done when

- On `webgl2-basic` and `webgl2-chrome`, `view.support` has WebGPU's shape, with WebGL-named facts.
- Every feature absent there is `off`, with its reason.
- Once WebGL 2 draws the globe, terrain, imagery and meshes, the required-content invariant holds for them.

## Plan

`docs/superpowers/plans/2026-11-13-engine-profiles.md`, its milestone table.
