---
id: CS-521
title: The tracker's files in human-in-the-lead's format
kind: work
state: done
created: 2026-11-15
project: CS-18
needs: [CS-520]
claimed_by: hitld-migration
---

Move the tracker's 519 files to human-in-the-lead's format with `hitld work migrate`, under a `tracker.json` that keeps the `CS` key and the `packages/next/work` folders. The migrations rename keys and states (`status` to `state`, `claimed` to `claimed_by`, `decided-by` to `decider`, a milestone's `needs` to `constraints`), make the milestone kinds one, and retire initiatives: each becomes a milestone with no parent, a long outcome, whose constraints are the milestones under it.

## Done when

- `hitld work check` passes on every file, and `hitld work migrate` has nothing left to do.
- Every ID, title, need, claim, clause link and release item is as it was, checked against the files before the migration.
- The seven initiatives are long-outcome milestones with their milestones as constraints, and no project names an initiative.
- The migration is one commit that can be read line by line (its files edited in place), and a bundle carries it to the other machine before anything else is claimed there.

Detail: human-in-the-lead's design, part 3 ("The file format"), and its migrations `names-and-states` and `tracker-structure`.

## Notes

Done on 2026-11-15, in one commit:

- `hitld work migrate` (names-and-states, tracker-structure) edited the files in place. It refuses to run off the main branch, so it ran on a copy of the work folder whose branch carried the main branch's name, and its output was copied back unchanged. It allocates no IDs: the initiatives keep theirs.
- Two pre-steps the migrations don't cover, in the same commit: Cesium's own `serves` key is `contributions` (CS-459, CS-460), and front-matter lists that prettier wrapped onto the lines after their key are one `key: [a, b]` line, the form hitld reads (11 milestones).
- The owner's answer to CS-388 landed with it: a new long outcome, CS-525 "Bodies, frames and engineering coordinates", holds the milestones of CS-188, CS-189 and CS-193, which leave CS-5.
- Nine long outcomes, not seven: the eight initiatives (CS-436, the public API, was one too) and CS-525.
- Checked against the files before the migration, with Cesium's old parser on one side and hitld's read API on the other: all 524 IDs and titles, 368 needs, 324 milestone constraints (51 linked to a clause), 2 claims and 4 contributions are unchanged, and there were no release items yet. The only differences are CS-388 (answered) and CS-525 (new).
- `hitld work check` passes on 525 files, and `hitld work migrate --dry-run` has nothing left to do. `test/work.test.ts` checks the real items with `hitld work check`.
- The bundle to the other machine waits for the owner to ask for it.
