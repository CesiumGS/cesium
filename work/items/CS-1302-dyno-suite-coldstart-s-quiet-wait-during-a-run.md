---
id: CS-1302
title: dyno suite coldstart's quiet wait during a run reads foreground CPU, not all CPU
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-1179, CS-1127]
---

> **Proposal.** Source: CS-1179's report (Dyno's quiet rule), relayed by orch-11's report audit (2026-11-24). Why now: dyno suite coldstart's quiet wait during a run still reads all CPU, not foreground CPU like the new rule. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `dyno suite coldstart`'s quiet wait during a run reads foreground CPU per core, as the quiet rule does.
- A test shows background-priority load no longer holds the wait.
