---
id: CS-1273
title: RowContinuity checks its affine-lanes premise, or says it only samples
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review, relayed by orch-11 (2026-11-24). Why: `RowContinuity` (`tableWindow.ts`) probes three points, which bound the gap between them only for a function that is affine in the lanes other than the key. Otherwise the probes sample rather than check. Today only the corridor declares `continuousRows`, and `CurvilinearSpec` is internal. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- A `continuousRows` declaration is refused unless the function's second derivative in the lanes other than the key is structurally zero, with a test that a nonaffine function is refused.
- If that check isn't feasible, `RowContinuity`'s documentation says that the probes sample, and under what premise they bound.
