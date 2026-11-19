---
id: CS-704
title: Dyno's board reads hitld's ledger incrementally instead of whole every 30 seconds
kind: work
state: proposed
created: 2026-11-19
project: CS-18
touches: [packages/next/scripts/vitePluginWork.ts, packages/next/scripts/workBoard.mjs]
---

**Proposal** (CS-686). Source: the CS-547 executor's report and orch-9's run summary, run 2026-11-18-2, 2026-11-19. Why now: Your move's In progress box (CS-547) reads the whole ledger (`hitld ledger tail --limit 1000000`) every 30 s to fold the merge queue's state, about 2 s per read today, and the ledger only grows. Rough size: small to medium. Decider: the owner. Filed: 2026-11-19.

## Done when

- The board reads only ledger events newer than the last read, or asks hitld for the queue's state directly if a read command offers it, and the read time stays flat as the ledger grows (measured on a ledger ten times today's size).
- The box's figures are unchanged, checked against a whole read.
