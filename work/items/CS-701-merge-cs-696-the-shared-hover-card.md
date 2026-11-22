---
id: CS-701
title: Merge CS-696, the shared hover card
kind: decision
state: done
created: 2026-11-19
project: CS-18
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-698 is rebased onto it when it reports."
answered_at: 2026-11-19T12:16:02.910Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-696, one hover card for the Work page's views, into main?

CS-696 is outside CS-690 A. Its branch passed the queue's checks by hand on main ed909b89c8: typecheck, hitld work check (698 files) and the full suite (5,673 passed, 0 failed); tested commit 7f3a120f29. One card replaces the Work page's hovers (Plan rows and markers, Dependencies nodes, Projects cells, lists, the pane's segments), with progress colors labeled in place, your answers first among blockers, and room to slip in items while the Plan counts items. It removes no CSS rule; Work.tsx changes +126/-61 ignoring whitespace. Deviations: new files views/HoverCard.tsx and hoverCard.css, mounts in Projects.tsx and Dependencies.tsx, tests. Presentation: orch-9-merge-ready-CS-696.md in the orchestrator's notes. CS-698 is stacked on it.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the tested commit (re-checked if main moves), regenerates the views and logs the merge; CS-698 is rebased onto it when it reports.
- B. Hold it: Nothing merges; CS-698, built on it, can't merge either.

Recommended: Merge it. It is green on main's tip, removes no styles, and its deviations are the card's own files and its mounts.

If unanswered by 2026-11-21T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
