---
id: CS-77
title: glTF `KHR_materials_*` onto the same material
kind: work
state: planned
created: 2026-11-13
project: CS-11
needs: [CS-75]
---

glTF `KHR_materials_*` onto the same material, except sheen and anisotropy. Needs CS-75. Sheen and anisotropy are CS-78, split out because only they wait for tier 2 (CS-76).

## Files

- `src/scene/gltfModel.ts`
- `src/shaders/surface.slang`

Detail: `docs/superpowers/plans/2026-11-13-materialx-live-graph.md`, its milestone table.
