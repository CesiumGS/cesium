---
id: CS-1008
title: Dyno's quiet rule gets a wait limit, after which the orchestrator holds executors until the measurement runs (CS-1004 C)
kind: work
state: planned
created: 2026-11-22
project: CS-389
needs: [CS-1004]
---

> **Committed by the owner (2026-11-22), through CS-1004's stopgap C.** Source: the Fable performance review (`fable-review-performance.md`).

## Done when

- A measurement that has waited longer than a stated limit for quiet raises a request that the orchestrator honors: it starts nothing new until the measurement has run.
- `dyno status` shows the wait and the limit, and its exit code tells a gate whether a measurement is waiting.
