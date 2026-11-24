---
id: CS-1236
title: Remove spikes/core-ir
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review, relayed by orch-11 (2026-11-24). Why now: the spike's work has moved into the IR, and the old copy invites drift. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `spikes/core-ir` is gone, nothing imports it, and the suite passes.
