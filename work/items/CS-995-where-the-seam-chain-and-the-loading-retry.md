---
id: CS-995
title: Where the seam chain and the loading-retry chain touch the same code, which lands first?
kind: decision
state: done
created: 2026-11-22
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T21:19:40.589Z
answered_via: question-tool
answered_by: owner
---

## Question

The content-source seam's chain and the loading-retry chain (CS-144 to CS-149) both edit the same streaming and globe code, with no order between them. Which goes first where they overlap?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The seam first; the retry items build on it.
- B. The retries first.

Recommended: A.

## Answer

Open.
