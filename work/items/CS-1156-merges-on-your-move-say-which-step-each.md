---
id: CS-1156
title: "Merges on Your move say which step each finished item is at: in review, fixing, waiting for a measurement, checking, waiting for your yes, or stalled"
kind: work
state: planned
created: 2026-11-23
project: CS-389
---

## Problem

Your move's Merges section lists every item closed on a branch and not merged, and gives each one a single line from `queueText`: waits for the owner's yes, being checked on a merge-check branch, in hitld's merge queue, turned down, or not in the queue. The owner can't tell an item in review from one waiting on the merge queue from one that is stuck.

On 2026-11-23 the section showed CS-847, CS-913, CS-971 and CS-1117, each as "being checked on hitld/CS-n-merge-check". In fact:

- CS-847 waited for its round 8 and a review;
- CS-913 waited for its closing round;
- CS-971 waited for a measurement in the next quiet window;
- CS-1117 waited for a fix round.

None was being checked. The state came from a merge-check branch left over from an earlier pass, which the page reads as "checking" for as long as the branch exists. The orchestrator's review and fix rounds aren't recorded anywhere the page reads, and the run's lease showed expired since 2026-11-22 while orch-11 was working.

## Done when

- c1: each row names one step, from what is on record: in review (a review dispatched, no verdict yet), fixing (a fix round dispatched), waiting for a measurement, checking (a merge-check branch whose tip is newer than the work branch's tip, with a check running), waiting for the owner's yes (an open "Merge CS-n" decision or hitld's held batch), or stalled.
- c2: "stalled" is shown when nothing has moved for the item (no commit on its branches, no ledger event, no open decision) for longer than a stated threshold, with what last happened and when.
- c3: a leftover merge-check branch, older than the work branch's tip, no longer reads as "checking".
- c4: where the page can't tell the step (the orchestrator records nothing for it), the row says so in words, rather than guessing.
- c5: a test per step over a fixture of branches and ledger events, and a look at the live page with today's four items.

## Notes

What the orchestrator should record so the page can tell (a ledger event per review and fix round, or a note on the branch) may need a hitld change: check hitld's issues for one before filing. Related: CS-1154 (In progress lists only running work).
