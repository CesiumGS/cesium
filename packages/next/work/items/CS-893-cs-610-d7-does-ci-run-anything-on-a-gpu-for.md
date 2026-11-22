---
id: CS-893
title: "CS-610 D7: does CI run anything on a GPU for alpha.1?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:23:44.556Z
answered_via: question-tool
answered_by: owner
---

## Question

Does CI run anything on a GPU for alpha.1?

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. None for alpha.1: Node tests on fakeGpu, with Dyno run IDs as the rendering evidence.
- B. A self-hosted GPU runner for branch pushes only.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: None for alpha.1. Dyno run IDs are the rendering evidence.
