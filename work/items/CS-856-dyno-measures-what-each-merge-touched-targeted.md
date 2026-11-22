---
id: CS-856
title: "Dyno measures what each merge touched: targeted A/B runs after merges, a quiet full run overnight, and regressions filed as items"
kind: work
state: planned
created: 2026-11-21
project: CS-389
needs: [CS-721]
touches: [packages/next/bench/**, packages/next/test/dyno*.test.ts, packages/next/test/bench*.test.ts]
---

The owner, 2026-11-21: "i think we get rid of it and rely on dyno to catch regressions, which means we need to do full benchmarking runs on occasion or at least the part that was recently affected by changed code." This replaces the per-merge cold-start gate (CS-715's note) with measurement that Dyno schedules itself.

Source: the owner, through the chief of staff. Why now: four engine merges sat behind a timing gate that a shared machine can't pass during the day. Rough size: medium. Decider: the executor, within this contract. Reverting a regression stays a decision for the owner or the orchestrator. Filed: 2026-11-21.

## Done when

- **Targeted runs after a merge.** Dyno maps a merge's changed files to the scenes and metrics that cover them, through `bench/suite/areas.mjs` and the catalog, and queues those runs. A test checks the mapping on fixture diffs. A change no scene covers says so, rather than running nothing silently.
- **Interleaved A/B.** Each targeted run alternates the merge's commit with the commit before it in one run. It reports each metric as faster, slower or can't tell, with its noise. A run that can't get `dyno status` quiet enough says "can't tell" and is retried in the overnight window.
- **Overnight full run.** The full benchmark suite runs overnight on AC power, under a quiet request, against the previous night. Change-point detection (`changepoints.mjs`) runs on the trends.
- **Regressions become items.** A new alert files an item naming the metric, the runs and the suspect commits, with CS-325's bisect when that exists. It never holds a merge. Budgets, the 1,400 ms cold start among them, are alert thresholds.
- **The orchestrators know the rule.** The merge brief and the root AGENTS.md's Dyno paragraph say that merges check correctness only, and that measurement follows from Dyno.

## Note (2026-11-22)

Until CS-919 is fixed, the after-merge A/B must not use `dyno lab --commit`. It runs the worktree's packages, not the commit's. Use a separate checkout and server for each side.
