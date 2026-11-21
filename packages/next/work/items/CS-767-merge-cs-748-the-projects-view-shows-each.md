---
id: CS-767
title: Merge CS-748, the Projects view shows each project as a bet
kind: decision
state: planned
created: 2026-11-20
project: CS-389
decider: owner
---

## Question

Merge CS-748, which replaces the Roadmap's Projects view on Dyno's Work page with one row per project on one grid, sorted by its next release, showing its next outcome, the releases it lands in, its clauses, and its own open decisions as badges on its row, into main?

Each project is one row: the next milestone's outcome (a project has no outcome of its own in hitld's read API, so the row says 'Next: ...'), which release slots it lands in, its progress by clauses, and up to three of its own open decisions as badges, then 'n more'. Projects with no open milestone form a group of their own at the end. Spend against appetite shows only once estimates exist; none do yet, so one sentence says so instead of an empty bar. It keeps the built-in ID 'projects', so old roadmap=projects links still work, at order 30 after Release and Path. The old ProjectsView code stays in Projects.tsx because Work.tsx still imports it; removing that is a later clean-up. Outside its touches: views/workProjects.tsx (the mount), bench/suite/projectBets.ts (the model) and its section in bench/suite/DESIGN.md. Replayed onto CS-746 (the Path view), since both add DESIGN.md sections. Checked by the executor: both themes, 380 px, keyboard only, no layout shift, a clean console; it has no motion. The executor's question, for later and not part of this merge: should a hitld project carry an outcome of its own, as milestones do? That changes hitld's format; the executor recommends yes. To try it once merged: #/work?view=roadmap&roadmap=projects on Dyno; open CS-389, then its CS-722 milestone; click a decision badge; turn the Proposed switch on. Checked by hand on main 8acd08c42f with CS-746 under it and CS-750 over it (tested 265f592a5f, the top of the stack): both type checks, hitld work check (763 files), surface (no API change), npm test exit 0 (372 files, 6,242 passed, no unhandled errors), test:data exit 0; no CSS rule removed. Presentation: orch-11-merge-ready-CS-748.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator merges it after CS-746, replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the Roadmap keeps today's Projects view, with decisions in lanes of their own.

Recommended: Merge it. Every gate passes on main's tip with the other views stacked under it, and it answers the owner's complaint: decisions now read as part of their project, one row each.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
