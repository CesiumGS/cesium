---
id: CS-710
title: Merge CS-704, the Work board read in under a second
kind: decision
state: planned
created: 2026-11-19
project: CS-18
decider: owner
---

## Question

Merge CS-704, the Work board read in under a second with a light count for the rail, into main?

CS-704's branch passed the queue's checks by hand on main 37e37eb00d (after CS-707): typecheck, the lib typecheck, hitld work check (707 files) and the full suite (5,694 passed, 0 failed); tested commit 1d94810d90. Root lint has only main's existing error in src/render/post/chain.ts. Dyno runs 2026-11-19T21-31-26-780Z and 2026-11-19T21-37-55-755Z: query.json warm 8.3 s to 89 ms, first request 10.8 s to 2.2 s, and at ten times the size first 48.5 s to 2.1 s. The first answer waits at most 1.5 s and may name pending sources, which fill in later (14.5 s live); other pages read only the new count.json. Deviations: workBoard.d.mts, two tests, the Dyno run workApiRun.mjs and one report.mjs row. No CSS removed. Presentation: orch-10-merge-ready-CS-704.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-706 then measures against it.
- B. Hold it: Nothing merges; the board keeps its 8 to 14 s read and every page keeps asking for it.

Recommended: Merge it. It is green on main's tip, it meets the item's budgets with Dyno runs cited, its figures match a whole read in a test, and its deviations are named.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
