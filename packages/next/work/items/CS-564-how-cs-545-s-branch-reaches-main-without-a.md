---
id: CS-564
title: How CS-545's branch reaches main without a hitld dispatch
kind: decision
state: planned
created: 2026-11-16
project: CS-18
decider: owner
---

## Question

CS-545 is done on its branch, but hitld's merge queue can't take a branch built outside dispatch: should it merge by hand after the queue's own checks, or wait for a hitld fix?

CS-545 ran outside dispatch as logged call E-17, because hitld's planner gave the run's only slot to another item (#148) and dispatch start was refused (#159). Its report is done, in the contract's shape, and the branch (06d87ccaf9) sits on main's tip with the item closed and a passing full suite. Only dispatch complete queues a branch, and it refuses orch-6-CS-545 as not in flight, so hitld merge finds nothing to present. The queue's checks here are the typecheck, hitld work check and the full suite.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge by hand after the queue's checks: The orchestrator runs the queue's fast checks and full suite on the branch in a fresh worktree, shows you the result as a batch, and on your yes fast-forwards main to it, regenerates the views and logs the merge as a call. (cost: One exception to merging only through the queue; the ledger's verified and merged events and the approval's trust evidence are not written by hitld.)
- B. Hold the branch for a hitld fix: The branch waits until a hitld release fixes #148 and #159; then CS-545 is dispatched, its executor adopts the branch and reports, and the queue presents it as usual. (cost: CS-545 waits on hitld for an unknown span; the branch needs a rebase if CS-562 or CS-563 land first, since they change the same Work page files.)

Recommended: Merge by hand after the queue's checks. The branch is on main's tip, the checks are the queue's own commands, and you still approve the merge; holding it only risks a rebase against CS-562 and CS-563.

If unanswered by 2026-11-19T17:00:00Z: Hold the branch for a hitld fix.

## Answer

Recorded in the front matter once answered.
