---
id: CS-782
title: Merge CS-774, npx dyno works through a private workspace package, run as npx --no-install dyno
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-774, which adds the private workspace package packages/next/tools/dyno (bin dyno, no dependencies) to the root workspaces list, so that npx --no-install dyno runs Dyno's command from the root or packages/next, with every doc, help text and recorded run saying npx --no-install dyno, into main?

Why --no-install: an unrelated public npm package is also named dyno (1.4.1, a Mapbox DynamoDB library). npm 11.17.0's own code (libnpmexec) installs a missing package with only a warning when stdin isn't a terminal or CI is detected, which is how agents and CI run commands; only --no-install (yes false) makes it fail instead. So wherever the workspace link is missing (the main checkout until its root npm install runs, worktrees cut before this merge, a fresh clone), a bare npx dyno would download and run that package. The executor found the name clash; the orchestrator read npm's code and sent a fix round, and now every documented form and the recorded command say npx --no-install dyno, and test/dynoBin.test.ts names any bare one. The root change is the workspaces list only: the root has no lockfile (package-lock=false). 1.x's build scripts read only published workspaces, so they don't see it; CI's npm pack --workspaces will make one extra dyno-0.0.0.tgz that its verify script never reads. npm pack for @cesium/next changes by one file, the new test (2,791 to 2,792 on main). Not changed: the root AGENTS.md still says node packages/next/bench/dyno.mjs, and the old wrappers still print the long path (CS-772 retires them). Checked by hand on main f47409f93f (tested bbf2142fc2, with npm install in its worktree): both type checks, hitld work check, surface (no API change), test:data exit 0, npx --no-install dyno --help from the root and packages/next exit 0. npm test: exit 1 on two noSceneGains tests (CS-538, known to fail under load; this branch changes nothing under src/), then 8 of 8 alone, three times; every other file passed (374 of 375, 6,402 tests). A question beside it, for you and not part of this merge: should the root .npmrc also set yes=false? That makes every npx in the repository fail instead of downloading a missing package, so a habitual bare npx dyno is safe too, but it changes npx for 1.x developers (a one-off npx somepkg would need --yes). The orchestrator's recommendation: --no-install in every documented and recorded form now, and leave .npmrc alone unless you want the stronger guard. The other route, a scoped name such as npx @cesium/dyno that nobody outside can squat, would change the name you chose. Presentation: orch-11-merge-ready-CS-774.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge. The main checkout needs one root npm install before npx --no-install dyno works there. CS-393 and CS-580 can then start.
- B. Hold it: Nothing merges; dyno stays node packages/next/bench/dyno.mjs, and CS-393 and CS-580 wait.

Recommended: Merge it. Every gate passes, the noSceneGains failures are the known load failure and pass alone, and --no-install closes the download path everywhere the repository says how to run it.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
