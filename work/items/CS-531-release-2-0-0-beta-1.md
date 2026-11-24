---
id: CS-531
title: Release 2.0.0-beta.1
kind: work
state: planned
created: 2026-11-15
project: CS-18
needs: [CS-527, CS-1166, CS-1167, CS-505, CS-1162]
release: 2.0.0-beta.1
---

## Done when

- `hitld release make` has made 2.0.0-beta.1, with its record and tag, on the owner's word, and every gate this item needs was met first.

## Notes

The release item for 2.0.0-beta.1 (the owner's answer to CS-455, the release ladder): feature complete for 2.0; the API changes only through a review the owner approves. Which milestones it needs is CS-527; once answered, they join its needs.

On 2026-11-18 beta.1 also needs CS-463 (CS-509, public Jobs API, waits on it) and CS-461 (the worker-mode spike CS-99, which worker mode needs) (owner, 2026-11-18, fixing the release crossings CS-685 found).

CS-505 (issues 2.0 found are filed and answered) joined on 2026-11-21, on the owner's word in a sweep of milestones that were in no release.

CS-493 (planets show as points, then disks) joined on 2026-11-21, in the same sweep.

CS-471, CS-423, CS-465, CS-474, CS-495, CS-467, CS-534 and CS-504 moved here from 2.0.0 on 2026-11-21. On the owner's word, all eight change or add public API that freezes at beta.1: a renamed `lodTransitions` value, the default thread, the tick budget options, what shading reads under exaggeration, the B-rep extension format, and new view, query and styling options.

CS-830 (2.0's examples show its seams in use) joined on 2026-11-21, on the owner's word.

CS-657 moved to alpha.1 on 2026-11-21.

On 2026-11-23 the owner chose a series of alphas (CS-1157 A): beta.1's feature milestones moved into alpha.2 to alpha.5, and beta.1 became the feature and API freeze. It needs the last alpha, the final API review and freeze (CS-1167; the first review, CS-420 and CS-457, moved to alpha.2, since worker mode builds on it), the follow-ups for other teams (CS-505), and the fixes the alphas turn up (CS-1162). Its loose work items joined milestones.
