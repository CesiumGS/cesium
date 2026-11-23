---
id: CS-1044
title: CS-832's metadata path isn't in the seam that was built
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable seams review (`fable-review-seams.md`, finding 9), 2026-11-22. Severity: Important. Land before: alpha.1 for the precedence (CS-903); beta.1 for the rest. Decider: owner.

## Done when

- add the declared fields to `FeatureSchema` and a per-taxonomy label column to the row batches in CS-847 or CS-903, even if nothing reads them yet. Reserve `SourceHost.resources`.
- The finding's evidence in the review is rechecked first, since the code may have moved.
