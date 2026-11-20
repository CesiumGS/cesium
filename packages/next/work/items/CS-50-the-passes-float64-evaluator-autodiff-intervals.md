---
id: CS-50
title: The passes (float64 evaluator, autodiff, intervals with breakpoint splitting, rates, literals to uniforms)
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
needs: [CS-48]
claimed_by: orch-11-CS-50
touches: [packages/next/src/ir/**]
---

The passes (float64 evaluator, autodiff, intervals with breakpoint splitting, rates, literals to uniforms). Needs CS-48.

## Done when

- Today's tests for AD, intervals, Taylor bounds, the queries and the accuracy model pass when run on Cesium IR through the adapter, with the same tolerances.
- Each pass has a test on a vector program, which today's scalar IR couldn't express.
- Breakpoint splitting gives finite bounds over a line-to-arc join (the spike's case), with no dense sample outside them.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
