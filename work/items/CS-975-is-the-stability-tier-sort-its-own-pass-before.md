---
id: CS-975
title: Is the stability-tier sort its own pass before the name review?
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: B
answered_at: 2026-11-22T20:59:26.341Z
answered_via: question-tool
answered_by: owner
---

## Question

None of the 901 public exports carries @stable or @experimental, so CS-681's tier isn't applied. Sort tiers in their own pass first, or tiers and names in one review?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. One tier pass first, approved by the owner; names reviewed only for what is stable.
- B. Tiers and names in one review.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
