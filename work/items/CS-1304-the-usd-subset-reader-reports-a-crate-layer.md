---
id: CS-1304
title: The USD subset reader reports a crate layer whose sections don't decompress
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-914]
---

> **Proposal.** Source: CS-914's report (OpenUSD in WebAssembly as a test oracle), relayed by orch-11's report audit (2026-11-24). Why now: a crate layer whose sections don't decompress isn't reported today. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The subset reader reports a crate layer whose sections don't decompress, by name, instead of failing without a reason.
- A fixture with a corrupt section is refused, and the oracle agrees.
