---
id: CS-1211
title: Merge CS-540, the hitld work check test states its margin
kind: decision
state: planned
created: 2026-11-24
project: CS-199
decider: owner
---

## Question

Merge CS-540 into main? The test that runs `hitld work check` on the whole tracker gets a timeout that states its margin, so it stops timing out under full-suite load.

Measured: `hitld work check` takes about 6 s alone and up to 12 s at a load of 30 to 75 on this Mac (5,722 tracked files, 1,189 tracker files); the test never scans branches. What grows with the repository is the whole-tree classification and the item count, which the real tracker needs, so the done-when's other branch applies: the test's timeout is 120 s, about ten times the loaded time, with the child limited to 110 s and the measurement written beside it; a non-JSON result now fails with the child's output. A copy of the old test with a 4 s limit standing in for load fails, the new one passes, and a mutation (an item with a bogus kind) still fails the test with the right problem lines. One full suite under the lock, per your rule on flake checks: three failures in files this change can't reach (one is CS-538's noSceneGains fix, one the identity digest's load timing, one importBoundary needing a build). Test-only, plus the item and an empty changeset; no owner paths. Checked by the orchestrator on the replay 59cd1fb45c (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the test keeps timing out under load.

Recommended: A. Merge it. It removes a load timeout from the merge gates with a measured, stated margin, and the test still catches a broken item.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
