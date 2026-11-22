---
id: CS-890
title: "CS-610 D4: when do 1.x's releases move to the 1x dist-tag?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: B
answered_at: 2026-11-22T07:23:38.928Z
answered_via: question-tool
answered_by: owner
---

## Question

When do 1.x's releases of `cesium` and `@cesium/core` move to `--tag 1x`, so that `latest` points at 2.0? This changes 1.x's release task on main.

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. From the first 1.x release after alpha.1.
- B. Only at 2.0.0.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: B: only at 2.0.0. 1.x keeps `latest` until 2.0.0 is final.
