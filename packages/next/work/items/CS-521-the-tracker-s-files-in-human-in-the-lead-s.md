---
id: CS-521
title: The tracker's files in human-in-the-lead's format
kind: work
status: In progress
claimed: hitld-migration
created: 2026-11-15
project: CS-18
needs: [CS-520]
---

Move the tracker's 519 files to human-in-the-lead's format with `hitld work migrate`, under a `tracker.json` that keeps the `CS` key and the `packages/next/work` folders. The migrations rename keys and states (`status` to `state`, `claimed` to `claimed_by`, `decided-by` to `decider`, a milestone's `needs` to `constraints`), make the milestone kinds one, and retire initiatives: each becomes a milestone with no parent, a long outcome, whose constraints are the milestones under it.

## Done when

- `hitld work check` passes on every file, and `hitld work migrate` has nothing left to do.
- Every ID, title, need, claim, clause link and release item is as it was, checked against the files before the migration.
- The seven initiatives are long-outcome milestones with their milestones as constraints, and no project names an initiative.
- The migration is one commit that can be read line by line (its files edited in place), and a bundle carries it to the other machine before anything else is claimed there.

Detail: human-in-the-lead's design, part 3 ("The file format"), and its migrations `names-and-states` and `tracker-structure`.
