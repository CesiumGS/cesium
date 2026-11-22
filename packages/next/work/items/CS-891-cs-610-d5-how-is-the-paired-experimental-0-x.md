---
id: CS-891
title: "CS-610 D5: how is the paired experimental 0.x version numbered?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:23:40.743Z
answered_via: question-tool
answered_by: owner
---

## Question

How is the paired experimental version numbered? This is a one-way door.

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. 0.(100 × major + minor).patch, with the same prerelease suffix, so 2.0.0-alpha.1 pairs with 0.200.0-alpha.1.
- B. Independent 0.x versions.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: 0.(100 × major + minor).patch, with the same prerelease suffix.
