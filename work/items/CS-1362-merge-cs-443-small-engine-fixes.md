---
id: CS-1362
title: Merge CS-443, small engine fixes
kind: decision
state: planned
created: 2026-11-25
project: CS-189
decider: owner
---

## Question

Merge CS-443 into main? Ellipsoid.cartesianToCartographic keeps height near the equator, tile load, unload and slot reuse get clip tests, and a thrown server error resets the snap run.

Height near the equator: the error goes from about 3 µm to about 2 nm, stated with units and checked against a derivation by the review. The clip tests for tile load, unload and slot reuse and the snap run's reset are sound. The executor reported partial only because the Snyk scan couldn't connect and two tests in test/curvilinearViewVariants.test.ts fail; the review confirmed those two fail on their base commits in earlier reports too (they depend on real 5 ms timers), so they aren't this branch's, and the chief of staff is filing an item for them. Every done-when line is met, and the item closes as done. The Snyk scan of the snap and height fixes runs when the server connects again; the review read both. A Minor: the first height-fix commit alone breaks designTiles for a bisect; the branch's later commit fixes it. No owner paths; no handbook tab changed. Checked by the orchestrator on the replay 31453ad0ef (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh.
- B. B. Hold it: Nothing merges; the three small defects stay.

Recommended: A. Merge it. It meets the done-when, and the review found the fixes sound.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
