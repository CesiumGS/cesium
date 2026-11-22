---
id: CS-702
title: Merge CS-698, the Flow chart's hover card
kind: decision
state: done
created: 2026-11-19
project: CS-18
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; the run's scope is then done."
answered_at: 2026-11-19T12:36:57.439Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-698, the Flow chart's day-by-day hover card with per-stage changes, into main?

CS-698 is outside CS-690 A and is this run's last item. Its branch passed the queue's checks by hand on main 947b1d82d1: typecheck, hitld work check (699 files) and the full suite (5,681 passed, 0 failed); tested commit c4040fdc02. The chart's text readout becomes CS-696's card beside the crosshair, with each stage's count and change from the day before and what moved. A click on the chart now lists that day's moves instead of the band's stage. Deviations: test/dynoWork.test.ts, DESIGN.md, and views/HoverCard.tsx (new options for a moving anchor). It removes .work-cfd-hit and .work-cfd-read, which only FlowChart used (checked on main). Presentation: orch-9-merge-ready-CS-698.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; the run's scope is then done.
- B. Hold it: Nothing merges; the Flow chart keeps its text readout.

Recommended: Merge it. It is green on main's tip, its CSS removals are confined to the chart it rewrites, and its deviations are named.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
