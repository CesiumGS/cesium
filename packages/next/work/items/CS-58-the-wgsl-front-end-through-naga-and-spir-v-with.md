---
id: CS-58
title: The WGSL front end, through naga and SPIR-V, with diagnostics
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-48, CS-57]
---

The WGSL front end, through naga and SPIR-V, with diagnostics. Needs CS-48 and CS-57.

## Done when

- The spike's WGSL function lowers and evaluates exactly against its float64 form, and its gradient matches central differences.
- Every refused construct in a fixture list gives its diagnostic with the right span.
- `checkBundle` shows naga only in a lazy chunk.
- A page that never uses a WGSL function never fetches it.

## Files

- `src/ir/`
- `tools/naga/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
