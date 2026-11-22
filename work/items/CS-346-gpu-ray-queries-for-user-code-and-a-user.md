---
id: CS-346
title: GPU ray queries for user code, and a user compute slot
kind: work
state: proposed
created: 2026-11-13
project: CS-197
needs: [CS-345]
---

**Proposal** (CS-686). Source: later, by the owner on 2026-11-13: shipped only if a 2.0 feature needs it (`docs/design/investigations-2026-11-13.md`, decision 6). Why now: Committed work needs it: it is a constraint of CS-535 (Rays query the scene on the GPU), so that milestone cannot be checked while this stays proposed. It also waits on CS-345. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

`traceNearest` and `shade` on the GPU and a compute slot in the frame graph, shipped only if a 2.0 feature needs them (owner, 2026-11-13).

Detail: `docs/design/investigations-2026-11-13.md`, decision 6.
