---
id: CS-1204
title: Merge CS-538, the no-scene-gains test holds under load
kind: decision
state: planned
created: 2026-11-23
project: CS-199
decider: owner
---

## Question

Merge CS-538 into main? It fixes the load-sensitive failure in `test/noSceneGains.test.ts`, a test that has kept failing the merge gates.

The cause, as the item's note said: the test compared the view block without zeroing `View.transition` (word 104), which follows the smoothed gap between renders, so a loaded run with long gaps differed from a lone one. The fix zeroes that one word in the test's comparison and leaves the rest of the block compared. A new test with a fake clock (the gap between renders made long) fails before the fix and passes after, and a mutation (a look stage that changes a byte of the scene) still fails the test, so it guards what it should. Instead of the done-when's 20 full-suite runs, it made the failure deterministic and ran the full suite once, under the lock, per your rule on flake checks. Test-only, one test file plus the item and an empty changeset; no owner paths. Checked by the orchestrator on the replay 19bb671b30 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the test keeps failing under load and costs gate reruns.

Recommended: A. Merge it. It removes a flake that keeps failing the merge gates, and the test still catches what it guards.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
