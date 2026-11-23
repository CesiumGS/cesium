---
id: CS-1065
title: Per-view passes create GPU objects and arrays every tick; the zero-allocation target isn't measured
kind: work
state: proposed
created: 2026-11-22
project: CS-195
---

> **Proposal.** Source: the Fable performance review (`fable-review-performance.md`, finding F10), 2026-11-22. Severity: Minor. Land before: 2.0.0. **Items:** CS-463, CS-329. Decider: owner.

## Done when

- Pool these per view frame, as `pickReadback` already is. Put bytes allocated per steady tick in the suite's alert metrics.
- The finding's evidence in the review is rechecked first, since the code may have moved.
