---
id: CS-515
title: "Faster-than-real-time runs against real-time runs: which metrics agree"
kind: work
state: proposed
created: 2026-11-15
project: CS-195
needs: [CS-514]
---

**Proposal** (CS-686). Source: proposed 2026-11-15 with CS-512, the same virtual-clock work (`docs/design/benchmark-suite.md`); can't tell the section. Why now: Committed work needs it: it is a constraint of CS-511 (Scene benchmarks run faster than real time), so that milestone cannot be checked while this stays proposed. It also waits on CS-514. Rough size: small, about one reviewed change. Decider: the owner. Filed: 2026-11-15.

A study: before faster-than-real-time runs replace real-time ones, find which of the suite's metrics agree between the two modes on the same scenes and network profiles, and which are meaningful only in real time.

## Done when

- The suite's scenes run in both modes on the same machine and profiles, enough times to tell agreement from noise.
- Each metric is marked as agreeing, differing by a known amount, or real-time only, with the evidence.
- The verdict says whether the scene suite can default to faster than real time, and for which metrics.
