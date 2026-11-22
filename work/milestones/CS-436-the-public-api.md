---
id: CS-436
title: The public API
kind: milestone
state: dropped
created: 2026-11-14
owner: owner
constraints: [CS-420 c?, CS-457 c?]
reason: "The owner, 2026-11-17: long outcomes are retired; human-in-the-lead's next release uses plain milestones only."
---

## Goal

One public surface a host application can rely on: reviewed in rounds as the engine grows, each round proposing promotions, demotions, names and shape, the owner approving, and the approved changes made. Stability tiers say what may change. Each review is a milestone in The public API reviews (CS-437).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2; `docs/design/bodies-frames-and-engineering-coordinates.md`, "A public API review".

## Notes

Made by `hitld work migrate` (tracker-structure) from the initiative CS-436: a long outcome is a milestone with no parent. Its constraints are the milestones of the projects that were under it, marked `c?`; shaping gives it an outcome, done-when clauses and a check, and links each constraint to a clause.

## Retired

The owner, 2026-11-17: long outcomes are retired; human-in-the-lead's next release uses plain milestones only. Its constraints stay as they were for the record; each milestone it listed stands on its own and reaches a release through the release items (CS-530 to CS-533).
