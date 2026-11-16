---
id: CS-55
title: Styles move onto Cesium IR, literals as uniforms
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-50, CS-51, CS-52]
---

Styles move onto Cesium IR, literals as uniforms. Needs CS-50, CS-51 and CS-52.

## Done when

- `test/styleParity.test.ts` (1.x as oracle), `test/style.test.ts` and `test/vectorStyle.test.ts` pass unchanged.
- `FeatureStyle.evaluate` agrees exactly with 1.x's CPU `Cesium3DTileStyle` on the parity styles (the spike's result).
- The `tileset` parity suite with styles shows FLIP at the unstyled baseline.
- A value edit makes no new module or pipeline (a fake-GPU count test, as `test/styleCost.test.ts`).
- The bundle guard passes.

## Files

- `src/ir/`
- `src/scene/styleExpression.ts`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
