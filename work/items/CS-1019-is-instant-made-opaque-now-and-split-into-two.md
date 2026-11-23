---
id: CS-1019
title: Is Instant made opaque now and split into two parts later?
kind: decision
state: done
created: 2026-11-22
project: CS-196
decider: owner
answer: A
answered_at: 2026-11-23T03:56:20.122Z
answered_via: question-tool
answered_by: owner
---

## Question

Instant stores TT as one public float64 (about 0.12 µs near the present). Split it into two parts now, or hide its storage behind methods now and decide the split before beta.1?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Opaque now, with its resolution stated; decide the split before beta.1.
- B. Two parts now.
- C. Keep the public float64.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
