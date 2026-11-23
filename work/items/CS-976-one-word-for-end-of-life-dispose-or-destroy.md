---
id: CS-976
title: "One word for end of life: dispose or destroy?"
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: A
answered_at: 2026-11-22T20:59:34.945Z
answered_via: question-tool
answered_by: owner
---

## Question

12 classes have destroy() and 10 have dispose(). One word for end of life?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. dispose() everywhere, with [Symbol.dispose] on every disposable.
- B. destroy() everywhere, as 1.x says.
- C. Both: destroy for engine objects, dispose for helpers.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
