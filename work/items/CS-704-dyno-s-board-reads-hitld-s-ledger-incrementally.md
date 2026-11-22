---
id: CS-704
title: "The Work board reads in under a second: incremental ledger reads, cached git scans, and a light count for the rail"
kind: work
state: done
created: 2026-11-19
project: CS-18
claimed_by: orch-10-CS-704
touches: [packages/next/scripts/vitePluginWork.ts, packages/next/scripts/workBoard.mjs, packages/next/bench/suite/useWork.ts, packages/next/bench/suite/shell.tsx]
---

**Proposal** (CS-686). Source: the CS-547 executor's report and orch-9's run summary, run 2026-11-18-2, 2026-11-19. Why now: Your move's In progress box (CS-547) reads the whole ledger (`hitld ledger tail --limit 1000000`) every 30 s to fold the merge queue's state, about 2 s per read today, and the ledger only grows. Rough size: small to medium. Decider: the owner. Filed: 2026-11-19.

The owner, 2026-11-19: "also anything we can do to make that initial board read faster?" `/work-api/query.json` took 12 to 14 s on 5190 that day (curl, twice), and every Dyno page asks for it on load for the rail's count. Committed on the owner's word.

## Done when

- The board reads only ledger events newer than the last read, or asks hitld for the queue's state directly if a read command offers it, and the read time stays flat as the ledger grows (measured on a ledger ten times today's size).
- The box's figures are unchanged, checked against a whole read.
- `/work-api/query.json` answers in under 1 s warm and under 3 s on the dev server's first request, measured as a Dyno run on a ledger and branch count like today's and ten times it: hitld's reads run in one process or are cached across requests by HEAD and ledger length; git scans of other branches are limited to `hitld/*` branches and cached by their tips; `--bodies` is read only for the items that need text.
- The rail's count comes from a light endpoint (or the cached board), so pages other than Work never wait on or trigger the full read.
