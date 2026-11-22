---
id: CS-456
title: Refinement, profiles and streaming work in worker mode
kind: milestone
state: planned
created: 2026-11-15
project: CS-13
outcome: "Refinement's reads and `converged()`, the profiles' snapshots and streaming's network state behave the same in worker mode, the examples run through the façade, and the handbook explains the choice of thread."
constraints: [CS-120 c?, CS-31 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Split on 2026-11-15 from "Measurements set the default thread" (CS-423), on the owner's answer. CS-120 needs only the worker backend (CS-110), and nothing in the measurements needs it: in the façade plan's graph (`docs/superpowers/plans/2026-11-13-worker-facade.md`, section 6) it is a branch beside the probe and the widgets. Held in CS-423, it kept the default-thread decision waiting on the refinement, profiles and streaming plans.

CS-120 bundles several plans' pieces (CS-135, CS-136, CS-31, streaming's `NetState` forwarding, the examples, the handbook's threading tab); shaping may split it into one item per plan.

CS-31 moved here from CS-468 on 2026-11-17 (owner), with the clause it held there: "In worker mode, `view.support`, `view.effective` and `view.explain()` return what they return on the main thread, and under `strict` a pinned step that can't run throws synchronously on the main thread in both modes."
