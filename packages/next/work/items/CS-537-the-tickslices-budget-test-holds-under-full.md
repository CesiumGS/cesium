---
id: CS-537
title: The tickSlices budget test holds under full-suite load
kind: work
state: planned
created: 2026-11-15
project: CS-199
---

`test/bulk.test.ts`, "tickSlices … registers nothing while idle, keeps the loop busy while queued, and spends its budget a tick", failed once under the full suite's load on 2026-11-15 and passed alone three times out of three. It measures a time budget, so a busy machine can push it past its bound.

## Done when

- The test checks the budget without depending on how loaded the machine is (a fake clock, or a bound with a margin it states), or the reason it must time the wall clock is written beside it.
- The full suite passes it 20 times in a row on this Mac, and it still fails when the budget is broken.
