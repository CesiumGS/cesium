---
id: CS-777
title: The GLSL ES emitter's output is cross-checked against naga's, as CS-52 planned
kind: work
state: proposed
created: 2026-11-20
project: CS-10
needs: [CS-52, CS-580]
touches: [packages/next/test/irGlsl*.test.ts, packages/next/test]
---

CS-52's done-when asked that naga's GLSL ES output for one emitted WGSL module per test be compiled beside the emitter's own, as a cross-check. CS-52's executor wrote that test, but it skips because naga isn't installed, and installing naga is a new dependency. CS-52 merges with this one bullet open.

Source: CS-52's report, relayed by orch-11, 2026-11-20. Why now: it is the only open bullet of CS-52's done-when. Rough size: small. Decider: the executor, on this precedent. CS-574 (answered A by the owner, 2026-11-18) settled how the engine's tests get naga: `naga-wasm` 30.2.0 as a dev dependency of `@cesium/next`, which CS-580 adds. If naga-wasm 30.2.0 can't emit GLSL ES 3.00, this comes back as a decision for the owner, with the executor's other option: the naga crate's command line, pinned to CS-57's version, under `~/tools`, found through `NAGA`, with nothing added to the repository. Filed: 2026-11-20.

## Done when

- The cross-check test runs, doesn't skip, in a fresh worktree after `npm install`, using the `naga-wasm` dev dependency that CS-580 adds.
- For one emitted WGSL module per test, naga's GLSL ES 3.00 output compiles and links in WebGL 2 beside the emitter's own output, within CS-51's tolerances.
- If naga-wasm has no GLSL ES output, the test stays skipped with that reason, and the question goes back with both options.
