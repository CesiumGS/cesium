---
id: CS-1299
title: "Dyno's quiet rule and system work at utility priority: a noise test for that band, then the rule"
kind: work
state: proposed
created: 2026-11-24
project: CS-389
needs: [CS-1179]
---

> **Proposal.** Source: CS-1179's report (Dyno's quiet rule), relayed by orch-11's report audit (2026-11-24). Why now: the new rule counts system work at utility priority (20) as foreground load, so it can hold a measurement that this work doesn't disturb. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A noise test runs the same Dyno comparison with and without heavy utility-priority work, and its verdicts are recorded.
- If that work doesn't disturb measurements, the quiet rule stops counting it as foreground load; otherwise the result is recorded and the rule stays.
- The `dyno` skill and `bench/suite/DESIGN.md` say which priority bands count.
