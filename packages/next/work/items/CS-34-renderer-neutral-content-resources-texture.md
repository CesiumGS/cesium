---
id: CS-34
title: Renderer-neutral content resources (texture sources, `MeshData`, `ImageryCompositor`)
kind: work
state: done
created: 2026-11-13
project: CS-9
needs: [CS-33]
claimed_by: orch-11-CS-34
touches: [packages/next/src/scene/gltfModel.ts, packages/next/src/globe/**]
---

Renderer-neutral content resources (texture sources, `MeshData`, `ImageryCompositor`). Needs CS-33.

## Done when

- WebGPU parity suites give the same results as before the move.
- No content code holds a WebGPU object: `TIER_EXCEPTIONS` has no `GlobeImagery` entries.

## Plan

`docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
