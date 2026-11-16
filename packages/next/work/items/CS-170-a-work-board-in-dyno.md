---
id: CS-170
title: A work board in Dyno
kind: work
state: done
created: 2026-11-13
project: CS-18
needs: [CS-403]
---

A Dyno page over the work items on the current branch, like Backlog.md's board but over our own files.

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

Its place in Dyno is the first item of the rail's "Needs a look" group, which the Dyno harness's rail item (CS-403, project CS-389) reserves for it, with a count of decisions waiting on the owner. The owner decides whether to move this item to Planned.

## Done when

- The page shows every item on the branch in the right column, with the graphs, the filters and the ready and blocked views.
- Its counts match `views.mjs initiatives` and `views.mjs ready`.
- It passes the UI checklist in `packages/next/AGENTS.md`: both themes, 380 px, keyboard only, reduced motion, a clean console.

Committed (owner, 2026-11-13): build it now, with the rail (CS-403).

## Plan

`docs/superpowers/plans/2026-11-13-work-tracker.md`, section 9.
