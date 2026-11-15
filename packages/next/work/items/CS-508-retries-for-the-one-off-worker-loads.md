---
id: CS-508
title: Retries for the one-off worker loads
kind: work
status: Planned
created: 2026-11-15
project: CS-16
needs: [CS-383, CS-88, CS-147]
---

Once the job system owns the sky pack, star map and glare kernel loads (CS-88), a transient failure on one of them retries within its origin's budget, as content does (CS-147). Split from CS-383 on 2026-11-15.

## Done when

- A transient failure on the sky pack, star map or glare kernel load retries with jittered backoff and loads.
- Their retries count against their origin's retry budget, and a cancel on dispose stops them.

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, section 12.
