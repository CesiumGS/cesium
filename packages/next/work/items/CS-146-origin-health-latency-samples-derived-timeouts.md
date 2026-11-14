---
id: CS-146
title: Origin health (latency samples, derived timeouts, the retry bucket, throttling, `Retry-After` pauses)
kind: work
status: Planned
created: 2026-11-13
project: CS-16
needs: [CS-145]
---

Origin health (latency samples, derived timeouts, the retry bucket, throttling, `Retry-After` pauses).

## Done when

The policy table holds for the recorded profiles with zero timeouts at 20 Mbit/s and 80 ms; a 429 halves an adaptive window; a pinned window isn't touched; `Retry-After` pauses; the bucket's numbers are tested.

## Files

- `src/streaming/OriginHealth.ts`
- `RequestScheduler.ts`
- `io/worker.ts`
- `Jobs.ts`

Detail: `docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
