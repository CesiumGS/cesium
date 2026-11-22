---
id: CS-512
title: Scene runs on a virtual clock
kind: work
state: proposed
created: 2026-11-15
project: CS-195
needs: [CS-328]
---

A scene run's engine loop, camera path and time-varying content advance on a simulated clock rather than the wall clock, so a run ticks as fast as each tick's work finishes instead of at the display's rate. Proposed on 2026-11-15, to cut the suite's wall time.

## Done when

- It uses CS-816's public stepping clock, not a second one. (Added 2026-11-21.)
- A run's ticks, camera path and animation advance by a fixed simulated step, whatever each tick takes on the wall clock.
- A scene run on the virtual clock reaches the same camera positions at the same simulated times as a real-time run.
- Wall-clock timings (frame time, frames per second) are recorded only in real-time runs; a virtual-clock run says so in its results.

Detail: `docs/design/benchmark-suite.md`; the time director, CS-230, may already hold part of the clock.
