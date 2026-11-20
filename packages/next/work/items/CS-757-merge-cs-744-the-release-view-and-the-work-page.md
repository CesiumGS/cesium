---
id: CS-757
title: Merge CS-744, the Release view and the Work page's tab shell
kind: decision
state: planned
created: 2026-11-20
project: CS-389
decider: owner
---

## Question

Merge CS-744, which opens the Work page's roadmap on a Release view (what's left in a release and what's holding it) inside a tab shell the next views mount into, into main?

The Release view shows a release's milestones, clauses, open items and gates (decisions and outside waits, with age and what they block), an Exceptions count by a stand-in rule until CS-745, and sizes as items (no estimates exist yet). Two tab rows that never shift; a shared Proposed switch; older views (Plan, Dependencies, Projects) behind a menu; the kinds' legend behind a Key button; the No milestone tab's kind and state filters removed. New views mount by adding a views/workName.tsx file (one per view), with no shared file edited, so CS-745 to CS-750, CS-752 and CS-753 can run in parallel. Checked by hand on main 7f55263f06 (tested f1c3c8648f): both type checks, hitld work check (754 files), surface (no API change), npm test exit 0 (5,785 passed, no unhandled errors), test:data exit 0; no removed CSS class is still in use. Outside its touches: routes.tsx (any view slug), bench/suite/DESIGN.md, eslint.seatbelt.tsv. To try it: #/work?view=roadmap on Dyno once merged. Presentation: orch-11-merge-ready-CS-744.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip (after CS-390 if both are yes), reruns the type checks, work check and the Dyno tests, fast-forwards main, regenerates the views and logs the merge; CS-745 (Health) starts next, then the other views as slots free.
- B. Hold it: Nothing merges; the Work page keeps its old roadmap, and CS-745 to CS-753 wait.

Recommended: Merge it. Every gate passes on main's tip, and the shell unblocks the rest of CS-751's views in parallel.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
