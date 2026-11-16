---
id: CS-523
title: Dyno's board reads human-in-the-lead's read API
kind: work
status: Planned
created: 2026-11-15
project: CS-18
needs: [CS-521]
---

Dyno's Work page reads the tracker through `scripts/work/query.mjs`, the one adapter between the board and the tracker's files (its read API, version 2). Point it at human-in-the-lead's read API instead (`hitld work query --json`, version 3), as the board's design note planned.

## Done when

- The board reads only human-in-the-lead's read API at version 3, checks that version, and says so when `hitld` is missing or a different version.
- Long outcomes take the initiatives' place: on the roadmap's grouped view, in the scope picker, and in the milestone map's lanes.
- Every view (Your move, Roadmap, Proposals, Flow) shows the same items, counts and order as before the migration, in human-in-the-lead's state names.
- `test/dynoWork.test.ts` runs on the read API's shape.
