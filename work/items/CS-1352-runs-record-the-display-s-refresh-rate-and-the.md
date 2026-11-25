---
id: CS-1352
title: Runs record the display's refresh rate and the driver's prefer-maximum-performance setting
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-733]
---

> **Proposal.** Source: CS-733's report, relayed by orch-11 on 2026-11-25. Why now: the design lists the display's refresh rate and the driver's prefer-maximum-performance setting in a run's configuration, but nothing records or reads them yet. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- Each run records the display's refresh rate and, where the platform exposes it, the driver's prefer-maximum-performance setting, or says it can't tell.
- Compare and Overview show both and keep runs apart when they differ (tested).
