---
id: CS-786
title: Order's concurrency history reads when work really started, not commit dates
kind: work
state: proposed
created: 2026-11-21
project: CS-389
needs: [CS-749]
touches: [packages/next/scripts/workBoard.mjs, packages/next/bench/suite/views/workOrder.tsx, packages/next/test/dynoWork*.test.ts]
---

CS-749's Order view replaces the executor-slot setting with concurrency from history, shown as a labeled range (1 to 2 today). The board dates each item's span from commit dates. Replayed and merged branches get new commit dates, so 34 of 49 finished spans look instant and the range is weak.

**Proposal** (CS-686). Source: CS-749's report, relayed by orch-11, 2026-11-21. Why now: Order's range is only as good as its spans, and every merge adds more instant ones. Rough size: small. Decider: the executor chooses between git author dates and hitld's dispatch history (claim to close), within CS-704's read budget. Filed: 2026-11-21.

## Done when

- Each finished span runs from when work started to when it finished, from author dates or the dispatch record. A span with neither says so and is left out of the range rather than counted as instant.
- Order's range label says what it's drawn from and how many spans it uses.
- Tested on fixtures with replayed branches, where commit dates and author dates differ, and with read time inside CS-704's budget.
