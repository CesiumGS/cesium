---
id: CS-723
title: Merge CS-712, the affine and curvilinear rename
kind: decision
state: done
created: 2026-11-19
project: CS-17
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-720 then rebases onto it."
answered_at: 2026-11-20T03:53:03.124Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-712, which renames the transform graph's smooth, warp, curved and deformer to curvilinear and its rigid route steps to affine (CS-671's names), into main?

CS-712's branch passed the queue's checks by hand on main 65af35a096, one at a time: both type checks, hitld work check (716 files), shaders:check, surface (nothing to commit), the full suite (5,705 passed, 0 failed), the handbook build, and test:data (53 of 55: skyPack fails on the local store as on main; dish-tracks failed at a load near 25 and passed 60 of 60 alone); tested commit 3dbd10e7ea. Root lint has only main's existing error. It is a pure rename across 276 files; public names change (curvilinear(), CurvilinearFrame, CurvilinearMap, curvilinearAt, NonAffineRouteError, api/surface.txt 19 lines), true rigid helpers keep their names, and the migration kit maps Scene.verticalExaggeration. CSS: only renamed kind classes. CS-720 builds on it and merges after. Presentation: orch-10-merge-ready-CS-712.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-720 then rebases onto it.
- B. Hold it: Nothing merges; the graph keeps four words for one idea, and CS-720 waits.

Recommended: Merge it. It is green on main's tip, it applies the names you chose in CS-671, it changes no behavior, and 2.0 has no outside users to migrate yet.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
