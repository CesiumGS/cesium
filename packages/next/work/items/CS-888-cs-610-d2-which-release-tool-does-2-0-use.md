---
id: CS-888
title: "CS-610 D2: which release tool does 2.0 use?"
kind: decision
state: planned
created: 2026-11-21
project: CS-609
decider: owner
---

## Question

Which release tool does 2.0 use for lockstep stable packages and the paired 0.x line?

From CS-610's design (`docs/design/repository-build-and-release.md`), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. A repository script driven by `releases/<version>.md`.
- B. Changesets.
- C. release-please.

Recommended: A, the design's recommendation.

## Answer

Open. The owner asked for the tradeoffs and some research on current practice first, including release tooling for AI-assisted development (2026-11-21).
