---
id: CS-1233
title: The engine chooses a table's row window from its draws
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review (tables and the bounded search), its done-when 5, relayed by orch-11 (2026-11-24). Why now: CS-56 is partial without it. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- The engine chooses the row window from its draws, and recompiles when a draw outgrows it, with a test.
- The plan-and-profile example splits its road into draws of bounded station length.
- `corridorUnroll` switches to the table form.
