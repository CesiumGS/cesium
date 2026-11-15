---
id: CS-63
title: The MaterialX front end, including the lowering the MaterialX plan's task 9 had (no pre-IR emitter)
kind: work
status: Planned
created: 2026-11-13
project: CS-10
needs: [CS-50, CS-51, CS-55]
---

The MaterialX front end, including the lowering the MaterialX plan's task 9 had (no pre-IR emitter). Needs CS-50, CS-51 and CS-55.

## Done when

- The spike's graph lowers and evaluates to the spike's results.
- Value, category and wiring edits behave as the spike measured: a value edit is a uniform write; category and wiring edits are new shapes.
- A fixture of every stdlib node in the mapping table evaluates against MaterialX's own definitions on sample inputs.

## Files

- `src/ir/`
- `materialx/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
