---
id: CS-1142
title: What does a missing property read as?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:30:32.275Z
answered_via: question-tool
answered_by: owner
---

## Question

1.x styling has undefined; the IR has exact NaN semantics but no undefined. What does a missing property read as?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. An explicit missing value: an option type with defaults that make it total; the 1.x front end maps undefined onto it; NaN stays a number.
- B. A default per type.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
