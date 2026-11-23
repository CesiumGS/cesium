---
id: CS-1026
title: Does the package get per-feature entry points with byte budgets before beta.1?
kind: decision
state: done
created: 2026-11-22
project: CS-195
decider: owner
answer: A
answered_at: 2026-11-23T04:03:15.426Z
answered_via: question-tool
answered_by: owner
---

## Question

No entry point has a byte budget, so a minimal app's size isn't guarded. Per-feature entry points with byte budgets before beta.1?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Yes: per-feature entry points (CS-554, CS-765) with three budgeted pages in the bundle check.
- B. Not before beta.1.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
