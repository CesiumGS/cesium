---
id: CS-861
title: "CS-831 D1: does alpha.1's change-set type extend CS-552's?"
kind: decision
state: done
created: 2026-11-21
project: CS-579
decider: owner
answer: A
answered_at: 2026-11-22T06:05:23.971Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-552's change-set type has whole-feature `after` values, one result shape and no provisional IDs. It freezes in alpha.1.

From CS-831's design (`docs/design/editing.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Extend it: patch updates, per-operation versions, an explicit `overwrite`, geometry in a named CRS, provisional IDs, partial results and typed conflict kinds. (cost: a larger type to freeze.)
- B. Keep CS-552's type, and add the rest after alpha.1 as a new version. (cost: a second version of a frozen type.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A. Extended: patches, per-operation versions, explicit overwrite, named CRS, provisional IDs, partial results and typed conflicts.
