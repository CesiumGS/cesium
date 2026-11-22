---
id: CS-61
title: The API surface (a program is the normative input; languages as entry points loaded on demand; `CustomShader` hooks take programs or WGSL functions)
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-49, CS-55, CS-56, CS-58]
touches: [packages/next/src/ir/**, packages/next/src/scene/CustomShader.ts, packages/next/src/index.ts, packages/next/api/surface.txt]
---

The API surface (a program is the normative input; languages as entry points loaded on demand; `CustomShader` hooks take programs or WGSL functions). Needs CS-49, CS-55, CS-56 and CS-58.

## Done when

- `npm run surface` shows the new entry points.
- The import-boundary test enforces the rules.
- Every example uses the public forms.
- The handbook's shading and architecture tabs describe the contract, with their "checked" dates and statuses updated.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
