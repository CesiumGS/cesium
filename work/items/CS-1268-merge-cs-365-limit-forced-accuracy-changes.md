---
id: CS-1268
title: Merge CS-365, limit-forced accuracy changes carried into query results
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

## Question

Merge CS-365 into main? A ray answer made after a memory-forced screen-space-error raise now states what the raise added, in metres, as accuracy.limited, or says it can't tell.

What it does: RayAnswer.accuracy gains an optional limited: { meters?, note }. The bound is the geometric error of content drawn above the configured threshold that has finer content: 0 when the raise was on but that content was within the configured threshold, and no metres ('can't tell') when a drawing view has no record. The threshold each selection pass used is recorded per tileset and per view, and the check reads that, not the live threshold, so a raise that has just relaxed still counts until a pass runs under the relaxed value. A combined answer states metres only when every part does, so limited.meters never exceeds meters. Ray answers and measure's line of sight carry it; picks and heights don't carry uncertainty today. Stated limit: across a curvilinear route, neither figure is scaled by the route's stretch at the hit, which is documented in RayAnswer.accuracy, in thresholdRaise.ts and in the handbook (follow-up CS-1239). An Opus review found two Importants (a combine that could contradict itself, and a relaxed raise read as no raise), fixed in one round; a scoped Opus check found both closed, with no new Important. Minors for follow-ups: a tileset frozen just after a relax keeps settling until unfrozen (debug feature), and a missing metres can mean 'no error' as well as 'can't tell', which drops metres conservatively when combined. Minor bump for @cesium/core and @cesium/measure. No owner paths; api/surface.txt unchanged. Checked by the orchestrator on the replay e8cd0195a4. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; queries made under a memory-forced raise state their accuracy as if no raise happened.

Recommended: A. Merge it. It states the raise's effect or says it can't tell, never more than its inputs support, and both reviews' Importants are closed.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
