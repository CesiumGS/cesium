---
id: CS-700
title: Merge CS-693, the Projects view
kind: decision
state: done
created: 2026-11-19
project: CS-18
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-696 is rebased onto it when it reports."
answered_at: 2026-11-19T06:04:19.316Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-693, Dyno's Projects view (which also restores the progress-bar fill CS-694's merge broke), into main?

CS-693 is outside CS-690 A. Its branch passed the queue's checks by hand on main fdd0dbef50: typecheck, hitld work check (697 files) and the full suite (5,665 passed, 0 failed); tested commit 392edc330e. The roadmap toggle becomes Plan | Dependencies | Projects; Project waits goes, and its reordered matrix lives once, under Dependencies > Whole structure. CS-694's merge deleted the .work-roadmap-seg CSS rule, so the pane's progress bar and the stage bars on main have no fill; this branch restores it. Deviations: new files (projects.ts, views/Projects.tsx, views/projects.css, test/dynoProjects.test.ts) and routes.tsx (&roadmap=projects, &psort, old matrix links mapped). Presentation: orch-9-merge-ready-CS-693.md in the orchestrator's notes. CS-696 is stacked on it.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-696 is rebased onto it when it reports.
- B. Hold it: Nothing merges; main's progress bars stay without fill, and CS-696 can't merge, since it is built on CS-693.

Recommended: Merge it. It is green on main's tip, its deviations are new files and URL keys, and it fixes a visible regression on main.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
