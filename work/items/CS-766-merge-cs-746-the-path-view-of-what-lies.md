---
id: CS-766
title: Merge CS-746, the Path view of what lies upstream of a target
kind: decision
state: done
created: 2026-11-20
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-21T06:31:36.314Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-746, which adds a Path view to the Roadmap on Dyno's Work page that draws only what lies upstream of a chosen release, milestone or item (its milestones, its longest chain and its gates), into main?

Pick a target and the view draws what it waits on, with the longest chain as the spine, decisions and outside waits as gates, work that can start now marked, and a sentence on why it isn't done yet. An earlier release folds into one node; three or more side milestones that lead to the same node draw as one group that opens in place, so nothing moves. It mounts after the Release view (place roadmap, order 20) and retires nothing: the waves grid in the Dependencies view stays (the executor's question, below). Outside its touches: its section in bench/suite/DESIGN.md, placed after the Release view's; the replay kept both it and the Health view's section. Checked by hand on main 8acd08c42f (tested 7581ca5750): both type checks, hitld work check (763 files), surface (no API change), npm test exit 0 (370 files, 6,213 passed, no unhandled errors), test:data exit 0; no CSS rule removed. Checked by the executor: both themes, 380 px, keyboard only, no layout shift, a clean console; nothing animates. The executor's question, for later and not part of this merge: should the waves grid ('Earliest possible start, in waves') be removed now that Path is here? Its recommendation is a small follow-up item, once you've tried Path. To try it once merged: #/work?view=roadmap&roadmap=path on Dyno, then &release=CS-531, &focus=CS-456, &focus=CS-303 and &focus=CS-751. Presentation: orch-11-merge-ready-CS-746.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the Roadmap keeps the Release and Dependencies views only.

Recommended: Merge it. Every gate passes on main's tip, it adds files of its own and changes no shared code, and it answers what a target is waiting on in one drawing.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
