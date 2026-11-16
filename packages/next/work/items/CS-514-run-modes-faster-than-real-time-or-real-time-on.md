---
id: CS-514
title: "Run modes: faster than real time, or real time on a simulated or real network"
kind: work
state: proposed
created: 2026-11-15
project: CS-195
needs: [CS-512, CS-513]
---

The suite's command line and Dyno choose how a run keeps time and where its content comes from, and results record the choice.

## Done when

- `cli.mjs run` takes a mode: faster than real time on a simulated network, real time on a simulated network, or real time on the real network.
- Each run's results record its mode and network profile, and Dyno shows them beside the run and compares only runs of the same mode.
- The default is faster than real time for the scene suite, once CS-515 shows which metrics hold.
