---
id: CS-56
title: Tables and the bounded search, the first extensions, with the residual's row window
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-53, CS-54]
---

Tables and the bounded search, the first extensions, with the residual's row window. Needs CS-53 and CS-54.

## Done when

- The 39-line road compiles to the same program as a 3-element alignment: same equations and same shader, with only table data differing.
- The road's per-draw floats are at most what a window covering the largest draw needs. The test writes the window rule down.
- The corridor baseline holds on the compiled route: map within 10⁻⁸ m, Jacobian within 10⁻⁹, float32 change under 0.1 mm, offsets to ±1.5 km.
- Lattices and flattens of one kind share a pipeline (a fake-GPU count test).
- The plan-and-profile scene's first warped draw is no longer held by the corridor's compile. The example's refinement chip shows no "compiling" entry for it.

## Files

- `src/ir/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
