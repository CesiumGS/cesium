---
id: CS-1303
title: The USD subset reader refuses a list op that names the same item twice, as OpenUSD does
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-914]
---

> **Proposal.** Source: CS-914's report (OpenUSD in WebAssembly as a test oracle), relayed by orch-11's report audit (2026-11-24). Why now: the OpenUSD oracle refuses a list op that names the same item twice, and the subset reader accepts it. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The subset reader refuses a list op that names the same item twice, by name, as OpenUSD does.
- A fixture checked against the oracle shows both refuse it.
