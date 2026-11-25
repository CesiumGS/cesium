---
id: CS-1349
title: dyno device edits the label and class after enrollment
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-733]
---

> **Proposal.** Source: CS-733's report (each run records its device, configuration and state), relayed by orch-11 on 2026-11-25. Why now: the design says a device's label and hardware class are editable, but `dyno device enroll` sets them only once. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- `dyno device` edits a device's label and class after enrollment; each edit is an event, and past runs keep what they recorded (tested).
