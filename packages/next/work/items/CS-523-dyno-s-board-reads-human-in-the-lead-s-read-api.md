---
id: CS-523
title: Dyno's board reads human-in-the-lead's read API
kind: work
state: done
created: 2026-11-15
project: CS-18
needs: [CS-521]
claimed_by: hitld-migration
---

Dyno's Work page reads the tracker through `scripts/work/query.mjs`, the one adapter between the board and the tracker's files (its read API, version 2). Point it at human-in-the-lead's read API instead (`hitld work query --json`, version 3), as the board's design note planned.

## Done when

- The board reads only human-in-the-lead's read API at version 3, checks that version, and says so when `hitld` is missing or a different version.
- Long outcomes take the initiatives' place: on the roadmap's grouped view, in the scope picker, and in the milestone map's lanes.
- Every view (Your move, Roadmap, Proposals, Flow) shows the same items, counts and order as before the migration, in human-in-the-lead's state names.
- `test/dynoWork.test.ts` runs on the read API's shape.

## Notes

Done on 2026-11-15:

- `scripts/workBoard.mjs` is the board's one adapter. It reads human-in-the-lead's read API (`hitld work query --json`, version 3, with `--ready`) and its `work claims`, `work check` and `work show`, refuses any other API version, and says so on the page when hitld is missing or answers in another version (the dev server answers 503 with the reason). The board checks the version again. `scripts/work/` is gone.
- The one read that isn't hitld's is the state history behind Flow: the read API has none yet, so it comes from `git log` of the items' `state:` lines (and the `status:` lines from before CS-521, in hitld's names). The migration's renames add no event.
- The board's model speaks hitld's names: `state` (`proposed`, `planned`, `in-progress`, `done`, `dropped`, shown with their labels), `claimed_by`, `decider`, `waiting_on`, `contributions`. Long outcomes take the initiatives' place in the roadmap's grouped view, the scope picker and the milestone map's lanes. A project reaches a long outcome through its milestones.
- Checked view by view: the old board model on the snapshot from before the migration, against the new one on the same items migrated and read through hitld. With the migration's two data changes applied to the old side too, 23 of 24 views are identical in items, counts and order (Your move, the proposals, Flow's stocks, moves and measures, every roadmap and milestone-map view, the critical paths and the dependency matrix).
  - The two data changes: CS-174, an external item that was "In progress", is `planned` (only work items are ever in progress in hitld). And CS-196 and CS-197 have no milestones, so no long outcome reaches them; they were under CS-1.
  - The one view that differs is the roadmap's grouped view, which shows those two projects' 13 proposed items in a "No long outcome" row rather than dropping them; scoping to it scopes to the two projects.
  - The board counts a proposed item with an open need as blocked, as it always has; hitld's `--blocked` counts planned items only.
- Seen in Dyno's dev server on its own port, in both themes and at 380 px: Your move, Roadmap (map, list, long outcomes), Proposals and Flow, with a clean console.
- `test/dynoWork.test.ts` runs on the read API's shape, and checks the adapter against hitld's own answers.
