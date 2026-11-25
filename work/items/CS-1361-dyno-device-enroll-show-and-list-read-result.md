---
id: CS-1361
title: dyno device enroll, show and list read result files' heads or summaries instead of whole files
kind: work
state: proposed
created: 2026-11-25
project: CS-389
needs: [CS-733]
---

> **Proposal.** Source: CS-733's fix round, relayed by orch-11 on 2026-11-25. Why now: `dyno device enroll`, `show` and `list` read whole result files to find devices, which grows with the results store. Size: small. Decider: owner. Filed 2026-11-25.

## Done when

- `dyno device enroll`, `show` and `list` read only each result file's head or its summary, with the same output as today (tested), and their time no longer grows with result sizes (one Dyno run, cited by ID).
