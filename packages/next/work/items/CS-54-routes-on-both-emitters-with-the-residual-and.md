---
id: CS-54
title: Routes on both emitters, with the residual and df64 forms
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-52, CS-53]
---

Routes on both emitters, with the residual and df64 forms. Needs CS-52 and CS-53.

## Done when

- Compiled routes for every built-in agree between the two emitters on the GPU readback test.
- The WebGPU output matches CS-53's golden fixtures.
- On WebGL 2, the corridor baseline holds: map within 10⁻⁸ m of the CPU map, Jacobian within 10⁻⁹, and float32 change from the draw centre under 0.1 mm.

## Files

- `src/ir/`
- `src/transform/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
