---
id: CS-1275
title: Merge CS-583, the casterLoop slow-orbit test holds under full-suite load
kind: decision
state: planned
created: 2026-11-24
project: CS-199
decider: owner
---

## Question

Merge CS-583 into main? The casterLoop slow-orbit test keeps its simulated orbit, and its real-time limit becomes a hang guard with its margin written beside it, so it stops failing under full-suite load.

The finding: the test already runs on simulated time (a fake performance.now and counted ticks), so machine load can't change what it asserts; only vitest's 60 s real-time limit saw the load. The 4,200 ticks take about 22 s at rest and 38 s at load average 50, so the one failure on 2026-11-18 was probably that limit passed under heavier full-suite load (inferred, not reproduced). The fix raises the limit to 300 s, about eight times the loaded time, with that reason in a comment beside it, rather than cutting ticks and losing coverage. It still fails when the scale isn't held: a mutation that drops the held-scale memory fails it with 19 changes against at most 6. Test-only, with an empty changeset; no owner paths. The orchestrator read the one-hunk diff, and it meets the done-when's first two lines. The third, one or two full-suite runs passing, is the batch's full suite under your batch rule. Checked by the orchestrator on the replay e009ff3e76 (patch identical outside work/).

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the test keeps its 60 s limit and can fail under load.

Recommended: A. Merge it. It removes a load failure from the merge gates without weakening what the test checks.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
