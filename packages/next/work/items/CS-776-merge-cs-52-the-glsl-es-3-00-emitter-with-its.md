---
id: CS-776
title: Merge CS-52, the GLSL ES 3.00 emitter, with its naga cross-check left open
kind: decision
state: planned
created: 2026-11-20
project: CS-10
decider: owner
---

## Question

Merge CS-52, which adds Cesium IR's GLSL ES 3.00 emitter beside the WGSL one (every CS-51 program compiles, links and reads back in WebGL 2 within CS-51's tolerances), into main, closing the item with its third done-when bullet, the naga cross-check, moved to a follow-up?

In Chrome on this Mac (ANGLE on Metal), all 69 cases compile, link and read back through transform feedback within CS-51's tolerances; the worst error is 0.497 of the allowed tolerance. The 69 are CS-51's 58 programs plus 11 new ones (10 float3 ops and a float3 select), which both emitters pass. Both emitters share one vocabulary, so a missing op fails both. The naga cross-check isn't done: naga isn't installed here, and installing it is a new dependency, so the test is written but skips unless NAGA names a binary. Its wrapper and command line are untested, and compiling naga's output in WebGL 2 is not written. The executor's question: which naga, and where? Its recommendation: the naga command line from the naga crate, pinned to the version CS-57 will use, installed under ~/tools outside the repo like slangc and found through NAGA, with no repo dependency until CS-57 decides. Outside its touches: the WebGL 2 page bench/irGlsl.ts and .html, one suite entry (moved at replay from bench/run.mjs into bench/suite/commands/lab.mjs, where CS-721 put the table), its Node tests, and CS-51's page now sharing the compare code (same output; the WebGPU suite reran 69 of 69). Nothing outside src/ir imports it, and api/surface.txt is unchanged. For CS-53 and CS-54: the fixed struct and block names collide when two programs share one shader, so a name prefix option is needed before CS-54. Checked by hand on main 69d4655a2b (tested d65bf074ba): both type checks, hitld work check (773 files), surface (no API change), npm test exit 0 (374 files, 6,396 passed, no unhandled errors), test:data exit 0; no CSS. Your cold-start check (CS-715) failed once at 1,759 ms while four executors' test suites loaded the machine, with every phase slower alike. Rerun with main and CS-52 interleaved in one run, so the load fell on both alike, both are within budget and split both ways: without the board, main 1,319 ms and CS-52 1,366 ms; with it, main 1,360 ms and CS-52 1,321 ms. Both trees load the same 487 modules, so the page loads none of CS-52's code (run 2026-11-21T07-03-35-933Z-mac-apple). Presentation: orch-11-merge-ready-CS-52.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the IR and dyno tests, fast-forwards main, regenerates the views and logs the merge. CS-52 closes, and the chief of staff files the naga cross-check as its own item, which waits on your choice of naga.
- B. Hold it: Nothing merges until the naga cross-check is done; CS-53 and CS-54's GLSL half wait.

Recommended: Merge it. Every program passes in WebGL 2 with CS-51's tolerances, and the one open bullet waits on a new tool, which is better decided on its own than holding the emitter.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
