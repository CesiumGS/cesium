---
id: CS-1178
title: Dyno's Work board shows each executor's item, stage, context and running cost, and the orchestrator's
kind: work
state: planned
created: 2026-11-23
project: CS-389
needs: [CS-1172]
touches: [scripts/vitePluginWork.ts, scripts/workBoard.mjs, scripts/workBoard.d.mts, bench/suite/useWork.ts, bench/suite/views/Work.tsx, bench/suite/workHealth.ts, bench/suite/work.ts, bench/suite/DESIGN.md, test/**]
---

## Problem

The owner, 2026-11-23, about the Work board's in-progress section: "i want to know which executor is working on which item, and what stage of development its in, and stats about their context and the orchestrator as well. a running total of token/dollar cost for each executor would be helpful to see, too".

Today the section lists claimed items, but not who works on each, how far along it is, or what it costs. Its health note also reads "claims with no dispatch in flight in hitld's ledger" for every item an orchestrator's executor holds, because the orchestrator starts executors itself rather than through hitld's dispatch. On 2026-11-23 four of the five items it named had a live executor; only CS-977 had none (its first part merged, the rest waits for a next round). So the note sounds like a problem when there is none.

## Done when

1. **Who and what.** Each in-progress row names its executor (its session name, model and effort), whether its process is alive, and how long it has run. A row whose claim has no live executor says so plainly, apart from the rest.
2. **Stage.** Each row shows its stage in words: implementing, review, fix round n, merge gates (and which gate), merge-ready, or waiting (and on what). The stage comes from the orchestrator's own records, read only. Where those records can't tell, the row says "can't tell" rather than guessing.
3. **Context.** Each executor shows its context use: tokens in its latest turn against its model's window, as a bar and a figure, and how many times it has compacted.
4. **Running cost.** Each executor shows its running token totals (input, output, cache reads, cache writes) from its transcript, and an estimated dollar figure at list prices. The prices are a named, dated table in one place, and the figure is labeled an estimate at list price, not a bill. The section totals all executors.
5. **The orchestrator.** A row for the orchestrator itself: its session, whether it is active, its context use and its running cost, the executor cap and how many slots are filled, whether a Dyno pause or a quiet hold stands, and which merge gate chain runs now.
6. **Cheap and quiet.** The figures obey CS-1172's rules: they read on its coalesced cycle, never while a measurement waits or runs, and reading a transcript reads only what was appended since the last read.
7. **Local only.** Session ids, transcript paths and costs appear only on the local dev server. Nothing of them reaches a build, the handbook, a result file or a public pull request. A test checks that the production build carries none of it.
8. **Design pass.** The section's design goes in `bench/suite/DESIGN.md`, and the page passes the UI checks in `AGENTS.md`: both themes, 380 px wide, keyboard only, reduced motion, a clean console. Figures carry units and context.
