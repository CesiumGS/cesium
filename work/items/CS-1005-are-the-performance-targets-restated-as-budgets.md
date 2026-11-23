---
id: CS-1005
title: Are the performance targets restated as budgets per tick?
kind: decision
state: done
created: 2026-11-22
project: CS-195
decider: owner
answer: B
answered_at: 2026-11-23T03:41:16.442Z
answered_via: question-tool
answered_by: owner
---

## Question

Under vsync no scene shows 3 times lower CPU, because the bound is GPU time, and the one stored comparison against 1.147.0 isn't like for like. Restate the targets?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Keep them, and gate as planned.
- B. Restate them as budgets per tick (main-thread ms, GPU ms, bytes) on named devices, plus a like-for-like study.

Recommended: B.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
