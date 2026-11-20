---
id: CS-715
title: How the cold-start check runs from here on
kind: decision
state: planned
created: 2026-11-19
project: CS-389
decider: owner
---

## Question

Should Dyno's new cold-start check (1,400 ms budget) run routinely, and where?

CS-706 added a coldstart Dyno run with a regression budget of 1,400 ms and firstFrameMs in Dyno's alert metrics. It needs a GPU and a real browser, so the merge queue's checks can't run it as they are. Today nothing runs it unless someone asks.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Dyno with alerts: Dyno runs coldstart on the owner's Mac on its own schedule and `cli.mjs alerts --fail-on-new` flags a new regression in the next digest. (cost: A browser and GPU run on the owner's Mac when Dyno schedules it.)
- B. After each merge: The orchestrator runs coldstart after each merge that touches the viewer, engine or frames, and holds the next batch on a failure. (cost: Adds a GPU and browser run to merges; slower batches.)
- C. Only on request: Nothing changes; the check runs when someone runs it. (cost: A regression can go unnoticed until someone looks, as this one did.)

Recommended: Dyno with alerts. It is the executor's recommendation: it catches regressions without putting a GPU and browser run in the merge path.

If unanswered by 2026-11-23T12:00:00Z: Only on request.

## Answer

Recorded in the front matter once answered.
