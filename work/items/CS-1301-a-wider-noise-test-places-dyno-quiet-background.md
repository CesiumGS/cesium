---
id: CS-1301
title: "A wider noise test places DYNO_QUIET_BACKGROUND and DYNO_QUIET_GPU: more background levels and cold-start runs"
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-1179]
---

> **Proposal.** Source: CS-1179's report (Dyno's quiet rule), relayed by orch-11's report audit (2026-11-24). Why now: the noise test behind DYNO_QUIET_BACKGROUND and DYNO_QUIET_GPU used few background levels and no cold-start runs, so the bars are placed on thin evidence. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A noise test with more background levels, and with cold-start runs as well as warm ones, places DYNO_QUIET_BACKGROUND and DYNO_QUIET_GPU.
- The bars change only if the data supports it, and the run IDs are cited where the bars are set.
