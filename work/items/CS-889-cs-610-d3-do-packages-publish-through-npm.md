---
id: CS-889
title: "CS-610 D3: do packages publish through npm trusted publishing from release.yml?"
kind: decision
state: done
created: 2026-11-21
project: CS-609
decider: owner
answer: A
answered_at: 2026-11-22T07:23:37.752Z
answered_via: question-tool
answered_by: owner
---

## Question

Do packages publish through npm trusted publishing from `release.yml`, in a GitHub environment the owner approves? Staged publishes need 2FA approval. 2.0's trusted publisher sits beside 1.x's on `cesium` and `@cesium/core`, with a first manual publish where staging can't.

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Yes.
- B. Token-based for now.

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: Yes, trusted publishing in an owner-approved environment.
