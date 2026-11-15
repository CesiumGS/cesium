---
id: CS-34
title: Renderer-neutral content resources (texture sources, `MeshData`, `ImageryCompositor`)
kind: work
status: Planned
created: 2026-11-13
project: CS-9
needs: [CS-33]
---

Renderer-neutral content resources (texture sources, `MeshData`, `ImageryCompositor`). Needs CS-33.

## Done when

- WebGPU parity suites give the same results as before the move.
- No content code holds a WebGPU object: `TIER_EXCEPTIONS` has no `GlobeImagery` entries.

## Files

- `src/scene/gltfModel.ts`
- `src/globe/`

Detail: `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
