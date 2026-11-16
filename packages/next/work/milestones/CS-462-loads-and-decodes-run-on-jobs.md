---
id: CS-462
title: Loads and decodes run on Jobs
kind: milestone
state: planned
created: 2026-11-15
project: CS-12
outcome: "Content decode, one-off engine loads and dedicated worker groups run on Jobs with priorities and cancellation and the inspector shows them."
done_when:
  - "c1: glTF, 3D Tiles and terrain content decode at their tile's request priority; a tile that is deselected or evicted cancels its decode wherever it is, and upload preparation runs in the budgeted apply phase."
  - "c2: The glare kernel, the star field and the sky pack load below visible content, and are cancelled when the engine is disposed."
  - "c3: The Moon map, the Slang compiler and the B-rep kernels and sections keep their own workers but are scheduled through `Jobs` as dedicated groups, sharing its priorities and budget accounting."
  - "c4: The inspector's Jobs section shows, per job kind, running, queued, submit-to-applied latency, worker time and cancelled counts, and each worker's busy time by group (engine, dedicated, app); every value has a recorder column."
constraints: [CS-87 c1, CS-88 c2, CS-89 c3, CS-95 c4]
check: "integration-test test/engineJobs.test.ts, with test/jobs.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written: a tileset's decodes follow request priority and are cancelled on deselection and eviction, one-off loads are cancelled on dispose; with the existing test/jobs.test.ts (27 tests), and a Dyno run that flies away from a loading tileset and shows cancellations in the recorder's jobs columns.

## Shaping questions

- c4 can cover only the job kinds these items create; refit, imagery, occluder walk and warp fits come with CS-463. The recorder has no cancelled or per-kind columns yet.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 5 items are constraints marked `c?` until shaping links each to a clause.
