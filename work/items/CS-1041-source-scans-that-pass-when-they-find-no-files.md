---
id: CS-1041
title: Source scans that pass when they find no files
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 15), 2026-11-22. Severity: Minor. Land before: beta.1. **Items:** CS-835. Decider: owner.

## Done when

- One helper, `nonEmpty(files, what)`, used by every scan; add `.tsx`; make `repoPaths` cover `bench/**/*.mjs`.
- The finding's evidence in the review is rechecked first, since the code may have moved.
