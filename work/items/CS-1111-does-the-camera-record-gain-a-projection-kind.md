---
id: CS-1111
title: Does the camera record gain a projection kind in alpha.1?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T22:42:59.743Z
answered_via: question-tool
answered_by: owner
---

## Question

The public camera record is pinhole only. Add a projection kind now?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Decide the union in alpha.1; the orthographic camera follows.
- B. Wait for CS-218.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).

## Superseded (2026-11-23)

The owner revisited this the same day: a binary kind is the wrong generalization. CS-1122 replaces it: the camera record carries a general projective transform, and physical camera models are an optional ray model.
