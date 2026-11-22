---
id: CS-805
title: Catalog scenes record the development metrics that example scenes now do
kind: work
state: proposed
created: 2026-11-21
project: CS-389
needs: [CS-394]
touches: [packages/next/bench/suite/catalog/**, packages/next/bench/suite/commands/suite.mjs, packages/next/test/bench*.test.ts]
---

CS-394 records the development metrics (its section 4) for example scenes. Catalog scenes don't record them yet, so the two groups can't be compared on the same measures.

**Proposal** (CS-686). Source: CS-394's report, relayed by orch-11, 2026-11-21. Why now: the metrics only pay off when every scene reports them. Rough size: small to medium. Decider: the executor. A metric that changes a catalog scene's budget or its alerts comes back as a question. Filed: 2026-11-21.

## Done when

- Every catalog scene's run records the same development metrics that example scenes do, with the same names and units.
- Old runs without them still plot, and the gap is labeled rather than drawn as zero.
- One quick-tier run on the executor's own server shows them, with its run ID cited.
