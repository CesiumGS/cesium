---
id: CS-1218
title: Dyno's own first frame is over its 1,400 ms cold-start budget
kind: work
state: proposed
created: 2026-11-24
project: CS-389
---

> **Proposal.** Source: CS-553's cold-start run 2026-11-24T10-59-19-411Z-mac-apple, relayed by orch-11 (2026-11-24). Why now: Dyno's own page took 1,567 ms to its first tick against its 1,400 ms budget, so the measurement read failed for a reason that isn't the page being measured. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- Dyno's own first tick is within its 1,400 ms cold-start budget, measured in Dyno, or the budget is restated with a reason.
- CS-553's cold-start run is taken again, and its read passes or fails on the page measured.
