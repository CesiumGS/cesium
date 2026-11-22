---
id: CS-16
title: Streaming robustness
kind: project
state: planned
created: 2026-11-13
owner: owner
plan: docs/superpowers/plans/2026-11-13-streaming-robustness.md
---

## Summary

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, reviewed by the owner on 2026-11-13 (all eight recommendations accepted, plus request options at 1.x parity). Every fetch has a deadline from its origin's measured latency; transient failures retry with backoff inside per-origin budgets; 404 and 204 are empty content with the parent kept; failed tiles recover after cool-downs; ion tokens refresh once per generation. Closes `packages/next/work/README.md` follow-up 7. No durations: order and dependencies only.

It closes the old follow-up row 7: content fetches had no timeout and no retry, so a failed tile stayed failed (with a warning) for the session, and a request that never answered held a slot of its origin's window until no view needed the tile (cancelled after 30 frames). Wanted: a timeout from observed latency, retries with backoff for network errors, 5xx and 429 (`Retry-After`), 404 drawn as empty, and a token refresh on 401 for ion. Its status in that table was: planned, in this project (`2026-11-13-streaming-robustness.md`).
