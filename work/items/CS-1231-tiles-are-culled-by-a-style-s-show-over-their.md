---
id: CS-1231
title: Tiles are culled by a style's show over their property ranges
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-55]
---

> **Proposal.** Source: CS-55's review, relayed by orch-11 (2026-11-24). Why now: a style that hides most features still loads and draws every tile. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- A tile whose property ranges make a style's `show` false for every feature is culled, using interval evaluation of the style's IR, with a test.
