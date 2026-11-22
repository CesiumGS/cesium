---
id: CS-927
title: Merge CS-612, the new build system
kind: decision
state: planned
created: 2026-11-22
project: CS-609
decider: owner
---

## Question

Merge CS-612, the per-package build (Vite library builds into each package's dist/, tsc --build declarations, publint and attw checks), into main? It's covered by the owner's approval: 'you can do 612 and 613 as well, and i'll review their designs in the morning, ok to merge them before i review them, since they're easy to change'. It touches owner paths (AGENTS.md, package.json, package-lock.json, packages/cesium/package.json, api/surface.txt) and adds the two dependencies its design names.

CS-612 replaces 2.0's single library build with one per package: `npm run build` (scripts/build.mjs) writes each package's dist/ with preserveModules, emits declarations with `tsc --build`, and runs packed checks (checkDeclarations, publint, attw) on what `npm pack` would ship. The umbrella's browser build moves to scripts/build/browser.mjs; `build:site` is the old `vite build`. AGENTS.md now says `npm run typecheck` (tsc --build) instead of `-p tsconfig.lib.json`, and a fresh clone builds and tests with `npm ci && npm run build && npm test`. New dev dependencies, both named by the design, pinned exactly: publint 0.3.25 and @arethetypeswrong/cli 0.18.5; Snyk rates both healthy with no known vulnerabilities. A Claude review found one Important problem: core's `"sideEffects": false` let an application's bundler drop the dispose polyfill (disposeShim) and the IR passes' installer; the shipped dist/ had in fact lost the polyfill. The fix round (bb2bb46b37) lists those modules in core's sideEffects (src and dist paths), adds a bundle-check page that builds against dist/ in production mode and asserts both markers, shown by mutation; pack.mjs matches npm pack results by name; checkDeclarations keys dangling types by file; a listed-but-missing LICENSE.md or README.md is reported while a package is private (all seven lack LICENSE.md, six lack README.md, for CS-613). A scoped re-review found no Important problems. Its Minors, for CS-613: the IR marker can't catch a dropped static `import "./irPasses.ts"`, since the page reaches it by import(); the bare-import test misses `export * from` with effects, .tsx files and dynamic imports; the 'fails once public' branch is untested. Checked by the orchestrator on main d2e321c294 (replay 59492a07c4 of bb2bb46b37, patch identical outside work/): both type checks, tsc --build, work check, surface current (1,834 exports), npm run build exit 0 with every packed check, check:bundle exit 0 with the new page, shaders:check, eslint after the build, test:data exit 0, and npm test exit 0 (401 files, 6,717 tests) at load 7.7. Two earlier full runs under load 42 and 62 failed one test, importBoundary's globe-only Viewer bundle test, which passed alone both times (28 of 28); the bundle check takes about 1 s at low load and its message wasn't captured, so it's flagged to watch. That test now needs dist/ (run npm run build first), as AGENTS.md says. Parity, with a separate checkout and server per side (main parity-main against the replay, 12 suites): identical with timings aside apart from imagery, whose differences are within the run-to-run noise a main-against-main control showed; both sides log the same two console errors.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then CS-613, the release tooling, starts.
- B. Hold it: Nothing merges; CS-612 and CS-613 wait for the owner's review.

Recommended: Merge it. Every gate passes on main's tip with a clean full run, parity holds with separate checkouts, the review has nothing Important open, its dependencies are the design's, and the owner approved merging it before review.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
