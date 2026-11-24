---
id: CS-1227
title: Jobs that share a hung content worker fail with it, and failed imagery and terrain tiles never retry
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-969]
---

> **Proposal.** Source: CS-969's Opus security review, relayed by orch-11 (2026-11-24). Why now: one bad tile fails its neighbors' jobs, and those tiles stay missing. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- When the watchdog ends a worker, only the job that hung fails; the others are requeued, with a test.
- Imagery and terrain tiles that failed with a worker are retried with a bounded backoff, with a test.
