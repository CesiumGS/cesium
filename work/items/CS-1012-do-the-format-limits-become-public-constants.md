---
id: CS-1012
title: Do the format limits become public constants?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T03:48:25.536Z
answered_via: question-tool
answered_by: owner
---

## Question

The largest accessor, table, image and tile the engine accepts are fixed internally, and hosts with very large honest data will hit them. Make them public?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Named constants a host can read and raise.
- B. Internal only.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
