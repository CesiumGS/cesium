---
id: CS-54
title: Routes on both emitters, with the residual and df64 forms
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
needs: [CS-52, CS-53]
claimed_by: orch-11-CS-54
touches: [packages/next/src/ir/**, packages/next/src/transform/**]
---

Routes on both emitters, with the residual and df64 forms. Needs CS-52 and CS-53.

## Done when

- Compiled routes for every built-in agree between the two emitters on the GPU readback test.
- The WebGPU output matches CS-53's golden fixtures.
- On WebGL 2, the corridor baseline holds: map within 10⁻⁸ m of the CPU map, Jacobian within 10⁻⁹, and float32 change from the draw centre under 0.1 mm.
- Both emitters take a name-prefix option, so two compiled routes can share one shader without their names clashing. A test links two prefixed routes into one program on each backend. (Added 2026-11-20, from CS-52's report.)

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
