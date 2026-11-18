---
id: CS-511
title: Scene benchmarks run faster than real time
kind: milestone
state: planned
created: 2026-11-15
project: CS-195
outcome: The scene suite can run faster than real time on a simulated network, its results agree with real-time runs for every metric it reports, and any run can still choose real time on a simulated or a real network.
constraints: [CS-512 c?, CS-513 c?, CS-514 c?, CS-515 c?]
---

## Why

A full scene suite run takes about an hour, nearly all of it waiting on the wall clock: camera paths play at display rate, and tiles arrive at network speed. On a virtual clock with a simulated network, a run could go as fast as each tick's work finishes, which shortens every measurement loop. Real-time runs stay, on a simulated or the real network, for what only they can measure. Proposed by the owner on 2026-11-15.

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check. CS-515's verdict decides which metrics a faster-than-real-time run may report.

## Notes

Builds on CS-328's link-shaping content server (real-time network profiles).

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
