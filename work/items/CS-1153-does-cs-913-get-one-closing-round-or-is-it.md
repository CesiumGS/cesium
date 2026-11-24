---
id: CS-1153
title: Does CS-913 get one closing round, or is it scoped down?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-24T00:10:04.914Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-913's structural round holds and 300 generated hostile files pass, but six inputs escape the work budget (review-CS-913-invariant.md), for example a 5.6 KB crate file holding 625 MiB.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. One closing round: charge per outer item and before every allocation, count package bytes, charge typed arrays by size; generate crate, USDZ and facts shapes; measure peak heap and buffer memory; then the same invariant review.
- B. Scope it down: merge as a spike not hardened for untrusted files, and carry the six cases into CS-559.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
