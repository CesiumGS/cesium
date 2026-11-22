---
id: CS-760
title: Merge CS-745, the Health view of the work graph's exceptions
kind: decision
state: done
created: 2026-11-20
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge."
answered_at: 2026-11-21T04:41:56.830Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-745, which adds a Health view to Dyno's Work page that lists the work graph's exceptions, each with a proposed fix, and makes it the source of the Release view's Exceptions count, into main?

The view lists milestone loops, release crossings, items in two milestones, planned work in no milestone, old proposals, spend past appetite and what hitld work check reports, each with a fix in words and a command to copy (nothing is applied from the page). Claims with no live dispatch and branches merged but still open are shown for the run, not in Your move. Your move gets only the exceptions that need you, with a count. Decisions due can't be told yet: hitld's read API doesn't carry a decision's default and deadline, so the view says so. On today's tracker it finds 5 exceptions, 2 of which need you. Fixtures cover tonight's two milestone loops and the CS-341 release crossing. Outside its touches: one small edit to the Release view (its Exceptions count reads the Health view once it's mounted) and its section in bench/suite/DESIGN.md. Checked by hand on main 9b1fabfaf6 (tested 4345b5a0d9): both type checks, hitld work check (757 files), surface (no API change), npm test exit 0 (5,845 passed, no unhandled errors), test:data exit 0, noSceneGains 8 of 8 alone (it failed once under load in the executor's first run); no CSS rule removed. To try it: #/work?view=health on Dyno once merged. Presentation: orch-11-merge-ready-CS-745.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the Release view keeps counting exceptions by its stand-in rule, and Your move gets no exceptions list.

Recommended: Merge it. Every gate passes on main's tip, it changes no shared file beyond one count, and it makes the graph's problems visible in one place.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
