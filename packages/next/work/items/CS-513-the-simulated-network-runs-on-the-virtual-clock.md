---
id: CS-513
title: The simulated network runs on the virtual clock
kind: work
status: Proposed
created: 2026-11-15
project: CS-195
needs: [CS-328]
---

The network a scene sees is simulated on the same clock: content is served with each network profile's latency and bandwidth (CS-328) in simulated time, so a faster-than-real-time run still waits for tiles as a real link would make it wait, in proportion.

## Done when

- With the virtual clock, a request's latency and transfer time follow its network profile in simulated time, and the same run twice gives the same arrival order.
- Responses can come from the live content server or from a recording of one, so a run needs no network at all.
- Real-time runs keep CS-328's link shaping on the wall clock.
