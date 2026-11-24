---
id: CS-1221
title: State the content boundary's effective byte limits, and give budget refusals their own wording
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1188]
---

> **Proposal.** Source: CS-1188's scoped Opus check, relayed by orch-11 (2026-11-24). Why now: the byte budgets now refuse real data (lines and polygons over about 11 million vertices, more than five float64 columns at the full row count), and "is longer than its bound" misleads. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `docs/design/trust-boundary.md` states each budget's effective limit in vertices, rows and columns.
- A budget refusal names the budget and the bytes asked for, with a test for each.
