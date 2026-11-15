---
id: CS-61
title: The API surface (a program is the normative input; languages as entry points loaded on demand; `CustomShader` hooks take programs or WGSL functions)
kind: work
status: Planned
created: 2026-11-13
project: CS-10
needs: [CS-49, CS-55, CS-56, CS-58]
---

The API surface (a program is the normative input; languages as entry points loaded on demand; `CustomShader` hooks take programs or WGSL functions). Needs CS-49, CS-55, CS-56 and CS-58.

## Done when

- `npm run surface` shows the new entry points.
- The import-boundary test enforces the rules.
- Every example uses the public forms.
- The handbook's shading and architecture tabs describe the contract, with their "checked" dates and statuses updated.

## Files

- `src/ir/`
- `src/scene/CustomShader.ts`
- `src/index.ts`
- `api/surface.txt`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
