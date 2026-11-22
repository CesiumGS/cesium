---
id: CS-807
title: Merge CS-794, the transform passes load Cesium IR lazily, once a quiet plain cold start passes
kind: decision
state: planned
created: 2026-11-21
project: CS-10
decider: owner
---

## Question

Merge CS-794, which keeps Cesium IR out of a default view's start (startup modules 501 to 481) by loading it when the first curvilinear route or function map needs it, into main, after the plain 1,400 ms cold-start check passes at its commit on a quiet machine on AC power?

Startup modules: 501 on main, 481 with CS-794, below CS-794's 492 target; a guard test fails if src/transform imports Cesium IR eagerly again (a planted import fails naming the line), and CS-53's 28 goldens still match bit for bit. Under a curvilinear map, the first route asks for Cesium IR; the draws that route will draw stay hidden until it's installed, and a failed load refuses the route with its reason, so its draws are fitted. Cold start, all on AC power (run IDs 2026-11-22T02-47-20-378Z-mac-apple and 2026-11-22T02-55-37-938Z-mac-apple): interleaved with main in one run, CS-794 is faster, without the board 1,514 against 1,622 ms, with it 1,548 against 1,566 ms. But both are over the 1,400 ms budget today: the plain check at CS-794's commit measured 1,612 ms, with the CPU at 24 to 86% before each load, minutes after the Mac came back on AC power to charge. Overnight, main measured about 1,356 ms, so CS-794's saving should put a quiet run under 1,400. Your rule holds an engine merge until a plain check passes on a quiet machine, and an interleaved run doesn't pass it alone. So the orchestrator has a background run waiting for a quiet window (01:00 to 05:00 by the Mac's clock, on AC, low load), at most 24 hours. A behavior change to know about: FunctionCurvilinearMap.compiled and fitReason, right after fromFunction(), now read false and 'Cesium IR is loading' for the moment until Cesium IR arrives, then settle and fire changed(); the types are unchanged, and the doc comments say so. Outside its touches: src/transforms/fromFunction.ts, src/scene/world/routes.ts and worldCurvilinearMaps.ts (the consumers that wait), src/index.ts (re-exports from accuracy.ts, queries.ts and graph.ts; the same names, api/surface.txt unchanged), the bundle check (Cesium IR in a lazy chunk of a Viewer page, 78.3 KB), and three tests that now await loadIr(). Checked by hand on main 1d580bc3cc (tested 243232c770, replayed as 97feb2f7f5): both type checks, hitld work check (803 files), surface (no API change), npm test exit 0 (380 files, 6,221 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date), the bundle check, and on the replay the lazy-IR, golden, GLSL and curvilinear tests (243). Presentation: orch-11-merge-ready-CS-794.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it once a quiet plain check passes: When the waiting run passes the 1,400 ms budget on a quiet machine, the orchestrator replays CS-794 onto main's tip, reruns the type checks, work check and the lazy-IR and golden tests, fast-forwards main, runs the plain check on main, and then merges CS-35 the same way. If the quiet run fails too, it comes back to you with the numbers.
- B. Merge it now: The orchestrator merges CS-794 on the interleaved evidence, which overrides your rule once for an improvement; CS-35 still waits for a quiet plain pass on main.
- C. Hold it: Nothing merges; the startup stays at 501 modules, and CS-35 and the engine merges after it wait.

Recommended: Merge it once a quiet plain check passes. It follows your rule, the interleaved run already shows CS-794 faster than main, and a quiet overnight run should pass.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
