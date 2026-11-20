---
id: CS-713
title: Merge CS-708, 2.0 strict-mode safe
kind: decision
state: planned
created: 2026-11-19
project: CS-437
decider: owner
---

## Question

Merge CS-708, which makes create, dispose and create again on a canvas cheap and leak-free under React strict mode, into main?

CS-708's branch passed the queue's checks by hand on main 261f9ec2d9: typecheck, the lib typecheck, hitld work check (708 files) and the full suite (5,692 passed, 0 failed, including import-boundary, seam and API-reference tests); tested commit f171fbea91. Root lint has only main's existing error in src/render/post/chain.ts. Under StrictMode the viewer makes one device, not two, and fetches each frames file once; Dyno runs 2026-11-19T21-49-15-740Z and 2026-11-20T00-45-29-486Z put the median cold first frame at 2645 ms before and 1452 ms after, though the module phase also fell and CS-708 doesn't touch it. No new public option; the lifetime contract is in Engine's doc comment. Deviations: bench/strictMode.html, bench/strictMode.tsx and a bench/run.mjs entry. No CSS removed. CS-706 overlaps in src/frames and widgets and rebases if it merges second. Presentation: orch-10-merge-ready-CS-708.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves, as after CS-704), regenerates the views and logs the merge; CS-706 rebases onto it.
- B. Hold it: Nothing merges; the viewer keeps starting twice under strict mode.

Recommended: Merge it. It is green on main's tip with leak and fetch-once tests, it halves the strict-mode start cost, it adds no public option, and its deviations are named.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
