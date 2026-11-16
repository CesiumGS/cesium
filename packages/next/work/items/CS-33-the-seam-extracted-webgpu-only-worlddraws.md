---
id: CS-33
title: The seam extracted, WebGPU only (`WorldDraws`, `RenderDevice`, `WorldMirror`, `ViewRenderer`), as pure moves
kind: work
state: planned
created: 2026-11-13
project: CS-9
touches: [packages/next/src/render/**, packages/next/src/scene/**, packages/next/test/fakeGpu.ts]
tier_override: 3
---

The seam extracted, WebGPU only (`WorldDraws`, `RenderDevice`, `WorldMirror`, `ViewRenderer`), as pure moves. Needs nothing.

## Done when

- WebGPU parity suites give the same results as before the move.
- The WebGPU renderer is reached only through `WorldDraws`, `RenderDevice`, `WorldMirror` and `ViewRenderer`.
- The import-boundary test has a `webgl2` tier and forbids it from importing WebGPU code.

## Plan

`docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
