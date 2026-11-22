---
id: CS-804
title: The Scenes view lists group D's example scenes beside the catalog
kind: work
state: proposed
created: 2026-11-21
project: CS-389
needs: [CS-394]
touches: [packages/next/bench/suite/views/Scenes.tsx, packages/next/bench/suite/catalog/**, packages/next/test/bench*.test.ts]
---

CS-394 added group D, the example scenes such as `vex-x10-zermatt`, and kept it out of Overview, scorecards and budgets. The Scenes view doesn't list group D yet, so there's no page that shows an example scene's runs beside the catalog's.

Source: CS-394's report, relayed by orch-11, 2026-11-22. Why now: example runs are recorded but can't be browsed. Rough size: small. Decider: the executor. Filed: 2026-11-22.

## Done when

- The Scenes view lists group D in its own section, labeled as example scenes that set no budgets.
- Each example scene links to its runs and its development metrics.
- Group D still stays out of Overview, scorecards and budgets, and a test checks this.
