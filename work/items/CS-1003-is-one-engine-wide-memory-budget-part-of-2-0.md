---
id: CS-1003
title: Is one engine-wide memory budget part of 2.0?
kind: decision
state: done
created: 2026-11-22
project: CS-195
decider: owner
answer: A
answered_at: 2026-11-23T03:40:41.813Z
answered_via: question-tool
answered_by: owner
---

## Question

Each tileset has its own 512 MiB budget, and the shared arbiter counts one undivided byte figure and can't reclaim. CS-322 is a proposal. Is one engine-wide budget part of 2.0?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Yes: the seam's Want gains CPU and GPU bytes and a reclaim path before beta.1; sources move over by 2.0.0.
- B. The contract at beta.1, enforcement in 2.x.
- C. Keep per-source budgets.

Recommended: A.

## Answer

Open.
