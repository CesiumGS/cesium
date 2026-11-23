---
id: CS-1037
title: A run counts as valid when its conditions weren't recorded
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 9), 2026-11-22. Severity: Important. Land before: beta.1. **Items:** CS-404. Decider: owner.

## Done when

- Three states, not two: valid, warning, and "conditions unknown". A study's verdict needs at least the planned number of runs with known conditions, or it says "inconclusive: conditions unknown". Exclude a comparison run with no recorded baseline.
- The finding's evidence in the review is rechecked first, since the code may have moved.
