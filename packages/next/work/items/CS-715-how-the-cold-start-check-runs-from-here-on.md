---
id: CS-715
title: How the cold-start check runs from here on
kind: decision
state: done
created: 2026-11-19
project: CS-389
decider: owner
answer: "B. After each merge: The orchestrator runs coldstart after each merge that touches the viewer, engine or frames, and holds the next batch on a failure."
answered_at: 2026-11-21T04:58:03.086Z
answered_via: question-tool
answered_by: owner
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

## Notes

2026-11-20, the owner on how the check is judged while executors load the machine: keep the plain 1,400 ms budget, and hold a merge that touches the viewer, the engine or frames until the machine is quiet enough for the check to pass. An interleaved run against main (A/B) can be evidence, but it doesn't pass or hold a batch on its own.

**Replaced, 2026-11-21 (the owner).** The cold-start check no longer gates merges. A timing gate on a machine shared with executors measured the machine more than the code: the same tree measured from about 1,300 to 3,500 ms. The new rule:

- Merges check correctness only: the type checks, the suite, the data tests, and the parity suites when rendering changes.
- Dyno measures, on its own schedule. After a merge, it runs the scenes and metrics that the changed files touch, as an interleaved A/B against the commit before. A full run happens overnight when the machine is quiet, with change-point detection on the trends.
- A regression files an item, naming the metric, the runs and the commit from a bisect (CS-325). It never holds a merge. Reverting stays a decision.
- Budgets, the 1,400 ms cold start among them, become alert thresholds.
- A branch whose purpose is performance still measures itself as done-when evidence, not as a gate.

The targeted runs are CS-856.
