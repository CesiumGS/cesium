---
id: CS-796
title: Merge CS-580, naga-wasm 30.2.0 is a dev dependency of @cesium/next
kind: decision
state: planned
created: 2026-11-21
project: CS-199
decider: owner
---

## Question

Merge CS-580, which adds naga-wasm 30.2.0 to @cesium/next's devDependencies, pinned exactly, so CS-51's WGSL validation test loads it from the package's own install and runs in CI and in every fresh worktree, into main?

Your CS-574 answer (A) approved this dependency. The package, as npm reports it: integrity sha512-TNKjybMep7dUtmslyueiXMhZLa8Tr432/v0XUcbRfip0gb9liiiynoX8iLNcOkqK/8LaIoG+8HEy4LE6/y8R1w==, no dependencies of its own, no install script (only a prepack script, which runs on publish), MIT OR Apache-2.0, published 2026-09-30. It's installed with --ignore-scripts, and no lockfile is written (the root has package-lock=false). The test now loads naga-wasm by package name; only a missing package skips it, with a hint to run npm install, and any other import error fails. The bundle check gains an assertion that no chunk of the globe-only, styled-Viewer or IR-core builds holds a naga-wasm module; a planted import was caught. For CS-777 (the naga cross-check CS-52 left open): naga-wasm 30.2.0 can emit GLSL ES 3.00 (writeGlsl with version '300 es', checked on a vertex and a fragment entry point), so that item needs no new decision; its names for uniform blocks and varyings are generated, and reflect maps them back. Outside its touches: the assertion in scripts/checkBundle.mjs. Checked by hand on main ca3fb5fb47 (tested cb5a6d42da, with npm install in its worktree): both type checks, hitld work check (793 files), surface (no API change), npm test exit 0 (378 files, 6,271 passed, no unhandled errors), test:data exit 1 on dish-tracks alone (a known load failure at load 51; 5 of 5 alone, twice), the WGSL test 77 of 77 (none skipped), and the bundle check. No cold start: a dev dependency and a test. After merging, the main checkout and every worktree need npm install to get naga-wasm; until then the WGSL test skips with its hint. Presentation: orch-11-merge-ready-CS-580.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, runs npm install in the merge worktree, reruns the type checks, work check, the WGSL test and the bundle check, fast-forwards main, regenerates the views and logs the merge; the chief of staff runs npm install in the main checkout; CS-777 can start.
- B. Hold it: Nothing merges; the WGSL validation test keeps skipping outside the spike folder and failing in CI, and CS-777 waits.

Recommended: Merge it. It's the dependency you approved, pinned, with no dependencies or install script of its own, kept out of every production chunk by a test, and every gate passes but one known load failure.

If unanswered by 2026-11-23T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
