---
id: CS-550
title: The core IR spike's evaluator gets dot and intToFloat's signed zero right
kind: work
state: planned
created: 2026-11-15
project: CS-10
needs: [CS-48, CS-543]
touches: [packages/next/spikes/core-ir/**, packages/next/test/irSpike.test.ts]
---

CS-543 fixed the IR's signed-zero handling in `dot` and `intToFloat` against the spec, but the core IR spike's evaluator (`spikes/core-ir/`, outside CS-543's touches) still sums `dot` from +0 and passes -0 through `intToFloat`. `test/irSpike.test.ts` compares the IR with the spike and still agrees only because no spike program reaches those inputs.

## Done when

- The spike's evaluator gets `dot`'s and `intToFloat`'s signed zero as the IR now does (CS-543's fixes, citing the spec).
- `test/irSpike.test.ts` has cases that reach those inputs, so the two can't drift apart unseen.
- The full suite passes.
