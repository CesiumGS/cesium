---
id: CS-170
title: A work board in Dyno
kind: work
status: Proposed
created: 2026-11-13
project: CS-18
---

A Dyno page over the work items on the current branch, like Backlog.md's board but over our own files. Proposed, not committed: don't build it yet.

## What it shows

- A kanban by lifecycle: Proposed, Planned, In progress, Done, Dropped. Cards show the ID, title, project, kind, priority and, when claimed, who has it.
- The item dependency graph and the project dependency graph (the same graphs as `views.mjs mermaid items` and `mermaid projects`).
- Filters by initiative, project and kind, and a "waiting on the owner" filter (open decision items with `decided-by: owner`, and the items that need them).
- The ready and blocked views, with each blocked item's open needs.
- Read-only: it links to each file and never edits one.

## How it works

- It reads `packages/next/work/` on the branch Dyno is served from, through Dyno's dev server, and reuses `scripts/work/lib.mjs` for parsing and the graph, so it can't disagree with `views.mjs`.
- It runs nothing it reads, like the scripts.
- Claims on other branches stay a `views.mjs claims` job; the board shows this branch only, and says so.

## Not before

Where it sits in Dyno waits on Dyno's rail rethink, in the Dyno harness plan (`claude/plan-dyno-harness-18e1ff`, not yet reviewed or merged). When that plan is reviewed, its session adds the Dyno project here, and a `needs` on the rail item. Then the owner decides whether to move this item to Planned.

## Done when

- The page shows every item on the branch in the right column, with the graphs, the filters and the ready and blocked views.
- Its counts match `views.mjs initiatives` and `views.mjs ready`.
- It passes the UI checklist in `packages/next/AGENTS.md`: both themes, 380 px, keyboard only, reduced motion, a clean console.

Detail: `docs/superpowers/plans/2026-11-13-work-tracker.md`, section 9.
