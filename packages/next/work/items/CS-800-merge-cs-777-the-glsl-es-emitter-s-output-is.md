---
id: CS-800
title: Merge CS-777, the GLSL ES emitter's output is cross-checked against naga's
kind: decision
state: planned
created: 2026-11-21
project: CS-10
decider: owner
---

## Question

Merge CS-777, which closes CS-52's last open bullet: for every one of CS-51's 69 programs, naga-wasm's GLSL ES 3.00 output compiles, links and reads back in WebGL 2 beside the emitter's own, within CS-51's tolerances, and the Node test runs instead of skipping, into main?

naga-wasm 30.2.0 (CS-580's dev dependency) emitted GLSL ES 3.00 for all 69 modules, refusing none. In WebGL 2 (run 2026-11-22T00-58-24-960Z-apple-metal-3, Chrome on Apple M2, ANGLE on Metal) all 69 pass for ours and for naga's, with no compile or link messages; the worst error is 0.4967 of the allowed tolerance for both. The test runs, not skips, after npm install; only a missing package skips it, with a hint, and under CI a missing package fails. CS-52's NAGA binary path is gone. How naga's generated names are bound: every parameter and output gets a location, the uniform block is found through naga's reflection, and the captured outputs are its location varyings; the Node test checks each is declared in naga's code. naga's vertex output rewrites gl_Position.yz for clip-space depth; that can't affect the readback, because WebGL 2 can't capture gl_Position and every output leaves through a varying. naga's GLSL ES back end has no compute stage, so each module runs from a vertex entry. Outside its touches: bench/irGlsl.ts (the page runs naga's kernel beside ours) and a new src/ir/nagaVertex.ts (test support shared by the test and the page, like readback.ts; it imports no naga package and isn't exported from the entry point). Checked by hand on main 2e414abd4f (tested 1b90d05174): both type checks, hitld work check, surface (no API change), npm test exit 0 (378 files, 6,343 passed, no unhandled errors), test:data exit 0, and the bundle check: no naga-wasm module in any chunk of the production builds. The claim commit was amended to carry all five trailers; the tree is unchanged (tip 8d82c023f6). Cold start isn't needed: tests and a bench page. Presentation: orch-11-merge-ready-CS-777.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the GLSL tests, fast-forwards main, regenerates the views and logs the merge; CS-52's done-when is then met in full.
- B. Hold it: Nothing merges; the cross-check stays unwritten and CS-52's last bullet open.

Recommended: Merge it. All 69 programs agree with naga's output in WebGL 2 within tolerance, every gate passes, and naga stays out of every production chunk.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
