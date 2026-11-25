---
id: CS-1351
title: Dyno's browser views and summaries read legacy runs through the device claim
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-733]
---

> **Proposal.** Source: CS-733's report, relayed by orch-11 on 2026-11-25. Why now: `runDevice` reads legacy runs through the device claim in Node, but the dev server and Dyno's runs don't use it yet. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- Dyno's browser views and summaries read legacy runs through the device claim, the same way as Node does, and a legacy run shows the same device everywhere (tested).
