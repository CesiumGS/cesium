---
id: CS-793
title: Merge CS-784, the dyno tool is @cesium/dyno
kind: decision
state: done
created: 2026-11-21
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge; the chief of staff runs the root npm install in the main checkout; CS-393 and CS-580 can then start."
answered_at: 2026-11-21T16:33:03.359Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-784, which renames the private workspace package from dyno to @cesium/dyno, so npx @cesium/dyno runs Dyno's command and can never reach an outside package by its name, with every doc, help text, the root AGENTS.md paragraph and the recorded run command saying npx @cesium/dyno, into main?

Only Cesium can publish under @cesium, so a scoped name can't fetch the unrelated public dyno package. The package stays private and is never published; the bin is still called dyno. Without the workspace link, nothing downloads: tested from an empty directory with an unreachable registry, an empty user config and cache, where npx @cesium/dyno --help exits 1 asking only that registry. No bare npx dyno ran anywhere. A test scans ten files, the --help output and the recorded run command for any npx dyno or npx --no-install dyno, naming the file and line; a planted line was caught. npm pack for @cesium/next lists the same 2,807 files. The root package.json is unchanged (the folder didn't move); the root AGENTS.md changes only its dyno paragraph, outside the contract's markers. Outside its touches: one phrase each in packages/next/AGENTS.md and README.md, and two lines in docs/design/benchmark-devices-and-sharing.md. Old work items keep their history. Checked by hand on main e993148aab (tested a2d5caf85e, with npm install in its worktree): both type checks, hitld work check (790 files), surface (no API change), npm test exit 0 (377 files, 6,171 passed, no unhandled errors), test:data exit 0, npx @cesium/dyno --help from the root and packages/next with the registry unreachable. No cold start: it doesn't touch the viewer, the engine or frames. After merging, the main checkout and every worktree need a root npm install for the @cesium/dyno link; without it, two new dyno tests fail. Presentation: orch-11-merge-ready-CS-784.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno tests, fast-forwards main, regenerates the views and logs the merge; the chief of staff runs the root npm install in the main checkout; CS-393 and CS-580 can then start.
- B. Hold it: Nothing merges; npx --no-install dyno stays the guard, and CS-393 and CS-580 wait.

Recommended: Merge it. Every gate passes, the no-download case is tested offline, and it replaces a guard people must remember with a name that can't reach an outside package.

If unanswered by 2026-11-23T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
