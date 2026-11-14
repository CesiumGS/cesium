---
id: CS-170
title: A work board in Dyno
kind: work
status: Proposed
created: 2026-11-13
project: CS-18
---

A Dyno page over the files on the current branch: a kanban by lifecycle (Proposed, Planned, In progress, Done, Dropped), the item and project dependency graphs, filters by initiative, project, kind and "waiting on the owner", and the ready and blocked views. It reads the files only and reuses `scripts/work/lib.mjs` for the graph. Where it sits in Dyno waits on the rail rethink in the Dyno harness plan, which isn't merged yet; that plan's session adds its project and the dependency after review. Don't build it before then.

Detail: `docs/superpowers/plans/2026-11-13-work-tracker.md`, its milestone table.
