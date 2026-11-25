---
id: CS-1355
title: Merge CS-284, East Antarctica no longer drawn as ocean from far out
kind: decision
state: planned
created: 2026-11-25
project: CS-192
decider: owner
---

## Question

Merge CS-284 into main? Level-0 terrain tiles take geodetic up for their normals, which fixes a straight-edged dark polygon over East Antarctica in far-out views.

The bug was still there; only the repro camera had moved off it. At 1.5 times the distance, Cesium World Terrain's level-0 tile has oct vertex normals up to about 71 degrees off geodetic up over the flat ice sheet, so n·l went negative where the ellipsoid's is positive. The fix: a tile wider than three quarters of a half turn (level 0, in the geographic scheme terrain uses) takes geodetic up for its normals and keeps no oct normals for tiles upsampled from it; deeper levels keep their data normals, since steep normals there are real relief. Tests: the level-0 rule, upsampled children and skirt vertices, each failing without the fix. The failing view was rendered with the fix and read by eye (no image committed), and an n·l diagnostic rerun found 15 sunlit points rendered dark before and none after. The Lab's globe and parity suites (base 945cdd9764 against the fix, runs 2026-11-24T23-27-11-416Z-apple-metal-3 and 2026-11-24T23-27-48-443Z-apple-metal-3) agree in every parity score; neither renders a lit far-out globe, so CS-1321 adds an image check for this class. A Sonnet review found one Important (the doc claimed Fixed without showing the fix on the failing view), fixed, and its scoped check found nothing new. No owner paths; no handbook tab describes terrain normals. Checked by the orchestrator on the replay 5f2f251ccc (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh.
- B. B. Hold it: Nothing merges; far-out views keep the dark polygon.

Recommended: A. Merge it. It meets the done-when with a tested fix, and the review's finding is fixed.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
