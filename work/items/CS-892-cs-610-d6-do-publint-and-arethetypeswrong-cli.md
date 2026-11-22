---
id: CS-892
title: "CS-610 D6: do publint and @arethetypeswrong/cli join as pinned dev dependencies?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:23:42.551Z
answered_via: question-tool
answered_by: owner
---

## Question

Do publint and @arethetypeswrong/cli join as exact-pinned dev dependencies? They check that every package's exports and types resolve for users.

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Yes.
- B. No; write our own checks.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: Yes, exact-pinned dev dependencies, run by the release pipeline.
