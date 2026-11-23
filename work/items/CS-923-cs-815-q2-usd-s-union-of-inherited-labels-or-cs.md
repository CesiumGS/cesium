---
id: CS-923
title: "CS-815 Q2: USD's union of inherited labels, or CS-832's nearest-level rule?"
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: A
answered_at: 2026-11-22T17:31:10.602Z
answered_via: question-tool
answered_by: owner
---

## Question

When a USD prim inherits labels from several levels, does the engine take the union of them, as USD does, or CS-832's rule, the nearest level that has a label?

From CS-815's executor (2026-11-22). CS-815 is built as A.

## Options and recommendation

- A. The nearest level, for every source. USD's union becomes an option of CS-559's USD source.
- B. The union for USD sources, the nearest level for the others. (Cost: two rules in the label path.)

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
