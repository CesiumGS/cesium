---
id: CS-913
title: The subset reader's composition faults on broken assets, tested against OpenUSD
kind: work
state: proposed
created: 2026-11-22
project: CS-191
needs: [CS-901]
---

> **Proposal**, contingent on CS-901's answer A. Source: CS-900's comparison (run `2026-11-22T10-56-32-200Z-apple-metal-3`). Decider: owner. Filed 2026-11-22.

## Done when

- When a referenced layer is missing, the subset reader keeps the prims that don't depend on it. It reports the failed reference by name, as OpenUSD does, rather than dropping the prims under it.
- On the pallet sample it passes the three checks it misses today, compared against OpenUSD.
