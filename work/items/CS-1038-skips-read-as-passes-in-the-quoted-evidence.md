---
id: CS-1038
title: Skips read as passes in the quoted evidence
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 12), 2026-11-22. Severity: Important. Land before: alpha.1. **Items:** CS-57, CS-948. Decider: owner.

## Done when

- The gate script sets `CI=1` and compares vitest's JSON reporter totals with a checked-in expected skip list (test names and reasons); an unexpected skip fails. `test:data` prints which grids were absent and fails when a grid the diff's area needs is missing.
- The finding's evidence in the review is rechecked first, since the code may have moved.
