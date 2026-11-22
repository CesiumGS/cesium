---
id: CS-852
title: Merge CS-850, eslint passes on main again (the unused PostStageKind import goes)
kind: decision
state: planned
created: 2026-11-21
project: CS-199
decider: owner
---

## Question

Merge CS-850, which removes one unused type-only import (PostStageKind) from src/render/post/chain.ts so eslint passes on main again, into main?

One line removed; src/index.ts still exports PostStageKind from src/scene/postStage.ts, untouched. The import came in with c96bcedafc, which has no Work-Item trailer, and every merge check since showed the error. Executor: eslint on chain.ts clean, both type checks clean, test/post*.test.ts 2 files and 114 tests passed, work check 849 files. Checked by the orchestrator on main 15977668b9 (replay cc7da11c5e of 499db74f2d, patch identical outside work/): the repository's eslint exits 0, both type checks pass, test/post*.test.ts 114 of 114, work check 849 files. A type-only import doesn't reach the bundle, so the viewer's start is unchanged and no cold-start check applies. Presentation: orch-11-merge-ready-CS-850.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge; eslint passes on main and merge checks stop showing the error.
- B. Hold it: Nothing merges; eslint keeps failing on main and every merge check shows the error.

Recommended: Merge it. A one-line, type-only change that makes eslint pass on main again, with every check green.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
