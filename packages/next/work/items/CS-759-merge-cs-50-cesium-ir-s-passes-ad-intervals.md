---
id: CS-759
title: Merge CS-50, Cesium IR's passes (AD, intervals with splitting, Taylor bounds, rates, uniforms, kinks)
kind: decision
state: planned
created: 2026-11-20
project: CS-10
decider: owner
---

## Question

Merge CS-50, which adds Cesium IR's passes (forward-mode AD, intervals with breakpoint splitting, Taylor bounds, rates, literals to uniforms and kinks) in src/ir, matched against today's passes through an adapter, into main?

Each pass interprets Cesium IR's one structure. Today's test files for AD, intervals, Taylor bounds, the queries and the descriptors run unchanged on Cesium IR through an adapter (src/ir/fromTodayIr.ts, which CS-53 removes): 94, 36 and 185 tests pass at today's tolerances, and two planted mutations make them fail, so they really reach Cesium IR. New vector-program tests (22) cover what today's scalar IR can't express. Breakpoint splitting on the line-to-arc join (line to station 300 m, then an arc of radius 500 m) turns bounds that weren't finite into x [280, 331.181] m, y [-20, 20.900] m, z [0, 5] m, with 0 of 67,323 dense samples outside. src/transform is unchanged and stays the reference until CS-53; src/ir isn't a package entry, so nothing public changes. Outside its touches: five new test files. Checked by hand on main b38ea11175 (tested fd8d511874): both type checks, hitld work check (755 files), surface (no API change), npm test exit 0 (6,160 passed, no unhandled errors), test:data exit 0; no CSS touched. Presentation: orch-11-merge-ready-CS-50.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip (after CS-567 if both are yes), reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; CS-52 (the GLSL ES 3.00 emitter) is set up from it.
- B. Hold it: Nothing merges; Cesium IR has no passes yet, and CS-52 and CS-53 wait.

Recommended: Merge it. Every gate passes on main's tip, today's passes stay the reference, and parity is shown on today's own tests.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
