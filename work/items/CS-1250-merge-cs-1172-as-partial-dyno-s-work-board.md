---
id: CS-1250
title: Merge CS-1172 as partial, Dyno's Work board reads cheaply and pauses for measurements
kind: decision
state: planned
created: 2026-11-24
project: CS-389
decider: owner
---

## Question

Merge CS-1172's parts 1 to 4 and 6 into main as partial? Dyno's Work board stops re-reading and pushing while a measurement waits or runs, reads each live source at most once per interval, leaves hidden tabs alone, and runs its hitld reads in one child per cycle. Part 5's measurement waits for CS-1179's quiet rule.

What it does: while `dyno status` says waiting-for-quiet or busy, the board's server starts no live re-read and pushes nothing, and the page says live updates are paused, with the time of its snapshot. It catches up exactly once when the measurement ends. Changes cause at most one read per source per interval. A hidden tab reads once when it's visible again. hitld reads share one child per read cycle, with a deadline that kills a hung child. Three rounds: the first Opus review found three Importants (a failed catch-up stuck the board, hung reads had no deadline, a pause could catch up or tell more than once), closed in round 1. Twice, an orphaned batch child from the executor's tests spun at 85 to 100% CPU for over an hour with its parent gone, holding the machine above Dyno's quiet bar; the orchestrator stopped both. Round 2 gives every child the board starts a watchdog thread that kills it when its parent dies or its deadline passes, tested with a hitld that loops forever. Scoped re-reviews found each round's Importants closed and nothing new. Part 5, the before-and-after measurement with a busy tracker as Dyno runs, waits until CS-1179's quiet rule merges, so the item stays in progress. Not established: why hitld's own work check spun in a test's temporary repository (a hitld issue to look into). No owner paths. Checked by the orchestrator on the replay 95003f3f4a (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it as partial: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The item stays in progress until part 5's measurement, after CS-1179.
- B. B. Hold it until part 5: Nothing merges until CS-1179 merges and the measurement runs; the board keeps re-reading during measurements.

Recommended: A. Merge it as partial. It stops the board from loading the machine during measurements now, both reviews' Importants are closed, and the measurement can't run before CS-1179 merges.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it until part 5.

## Answer

Recorded in the front matter once answered.
