---
id: CS-1036
title: Dyno suite run --changed measures nothing after a commit, and for most packages, and exits 0
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 8), 2026-11-22. Severity: Important. Land before: alpha.1. **Items:** CS-199. Decider: owner.

## Done when

- With `--changed`, an empty selection exits 1 unless `--allow-none` is given, and prints the files that fell in no area. Default the ref to the merge base with main when HEAD has no local changes. Add a test that every renderer-tier folder falls in some area.
- The finding's evidence in the review is rechecked first, since the code may have moved.
