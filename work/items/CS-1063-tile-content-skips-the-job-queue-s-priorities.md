---
id: CS-1063
title: Tile content skips the job queue's priorities, and every byte crosses the main thread
kind: work
state: proposed
created: 2026-11-22
project: CS-195
---

> **Proposal.** Source: the Fable performance review (`fable-review-performance.md`, finding F8), 2026-11-22. Severity: Important. Land before: beta.1. Decider: owner.

## Done when

- Land CS-87 and CS-88 before the content-source seam's decoders are public, since `SourceKind` decoders register as Jobs types and will inherit this behavior. Make the pool size an engine option. Measure message tasks per tile in the hitch study.
- The finding's evidence in the review is rechecked first, since the code may have moved.
