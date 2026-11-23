---
id: CS-1061
title: One render bundle per world is recorded again on every draw change
kind: work
state: proposed
created: 2026-11-22
project: CS-195
---

> **Proposal.** Source: the Fable performance review (`fable-review-performance.md`, finding F4), 2026-11-22. Severity: Important. Land before: beta.1 for the sweep; 2.0.0 for the change. Decider: owner.

## Done when

- Measure first: a churn sweep in Dyno (resident batches from 500 to 20,000, one draw added per tick) reporting CPU ms and allocated bytes. Then record bundles per slab or per fixed chunk of batches so a change re-records one chunk, and update the batch table by changed rows as the other tables do. Fold the derived kinds lazily (most views need two or three).
- The finding's evidence in the review is rechecked first, since the code may have moved.
