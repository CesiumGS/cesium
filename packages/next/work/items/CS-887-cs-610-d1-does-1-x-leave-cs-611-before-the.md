---
id: CS-887
title: "CS-610 D1: does 1.x leave (CS-611) before the package move (CS-835)?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:23:36.653Z
answered_via: question-tool
answered_by: owner
---

## Question

The final `packages/core` would collide with 1.x's `packages/core`, so the package move can't land before 1.x leaves.

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. 1.x leaves first: CS-611 runs against the pinned `cesium-1x = npm:cesium@1.147.0`, then CS-835 moves into the freed root.
- B. Move first, and rename 1.x's folder for a while.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: 1.x leaves first.
