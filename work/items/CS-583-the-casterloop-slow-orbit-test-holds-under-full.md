---
id: CS-583
title: The casterLoop slow-orbit test holds under full-suite load
kind: work
state: planned
created: 2026-11-17
project: CS-199
touches: [packages/next/test/casterLoop.test.ts]
tier_override: 1
---

`test/casterLoop.test.ts`, "holds its scale on a slow orbit", failed once in CS-51's executor's full suite on 2026-11-18 and passed when rerun alone. It looks load-sensitive, like CS-537 and CS-538.

## Done when

- The test no longer depends on how loaded the machine is (a fake clock or counted steps, as CS-537 did), or the reason it must use the wall clock is written beside it with its margin.
- It still fails when the scale isn't held.
- One or two full-suite runs pass (the owner's rule for flake fixes: deterministic, a mutation, then a run or two, not many full-suite loops).
