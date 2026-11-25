---
id: CS-1360
title: BENCH_MACHINE's alias check refuses an alias that holds the host or user name, as enroll's does
kind: work
state: proposed
created: 2026-11-25
project: CS-389
needs: [CS-733]
---

> **Proposal.** Source: CS-733's fix round (each run records its device, configuration and state), relayed by orch-11 on 2026-11-25. Why now: `dyno device enroll` refuses an alias that holds the host or user name, but the `BENCH_MACHINE` alias path (`identity.mjs`, `machineAlias`) doesn't check it. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- An alias from `BENCH_MACHINE` is refused when it holds the host name or the user name, with the same check and message as enroll's (tested with hostile fixtures).
