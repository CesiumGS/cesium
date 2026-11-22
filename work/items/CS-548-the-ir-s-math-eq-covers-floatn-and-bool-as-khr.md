---
id: CS-548
title: The IR's math/eq covers floatN and bool, as KHR_interactivity defines it
kind: work
state: planned
created: 2026-11-15
project: CS-10
needs: [CS-48]
touches: [packages/next/src/ir/**, packages/next/test/ir.test.ts]
---

CS-543's executor, checking CS-48's IR against the whole KHR_interactivity spec, found that the spec defines `math/eq` on `floatN` (each of `float` to `float4`) and on `bool`, but the IR's `eq` takes only two `float`s. Its "Done when" left this as coverage, not a formula fix.

## Done when

- `eq` in the IR takes `float`, `float2` to `float4`, `int` and `bool` operands, as the spec's `math/eq` defines them, with its result type as the spec gives it.
- Its float64 meaning, the evaluator and constant folding share one function, as the plan asks of every op.
- Tests cover each operand type, citing the spec's text for `math/eq`.
- The full suite passes.
