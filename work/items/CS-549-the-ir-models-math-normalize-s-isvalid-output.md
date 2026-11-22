---
id: CS-549
title: The IR models math/normalize's isValid output
kind: work
state: planned
created: 2026-11-15
project: CS-10
needs: [CS-48]
touches: [packages/next/src/ir/**, packages/next/test/ir.test.ts]
---

CS-543's executor found that the spec's `math/normalize` has a second output, `isValid`, which the IR doesn't model. Its "Done when" left this as coverage, not a formula fix.

## Done when

- The IR's `normalize` has the spec's `isValid` output, with the spec's meaning, including the zero-length and non-finite cases.
- The evaluator, constant folding and the WGSL emitter handle the second output, or the emitter says plainly where it can't yet.
- Tests cover `isValid`, citing the spec's text for `math/normalize`.
- The full suite passes.
