---
id: CS-1251
title: Merge CS-127, the frame-jump script
kind: decision
state: planned
created: 2026-11-24
project: CS-14
decider: owner
---

## Question

Merge CS-127 into main? scripts/frameJumps.mjs reads a recording's rendered images in tick order and writes, per tick, the share of pixels whose linear luminance jumped by more than a threshold, so the level-of-detail work can tell a pop from a smooth transition.

It implements the jump statistic in section 8 of the level-of-detail transitions plan. The script reads the recorder's dumps (`frame-<tick>.png`, numeric tick order, two images in memory at a time), decodes sRGB with the exact piecewise curve, takes Rec. 709 luminance, and writes a CSV of tick, share and largest change. It prints the peak share and the count of steps above 1%. The threshold defaults to 0.1 in linear luminance, and alpha is ignored. It decodes with sharp, which the repository already has, so it adds no new dependency. 24 tests pin exact values, and 14 mutations each fail them. A Sonnet review found no Important; Minors for later: name the file in decode errors, reject duplicate ticks such as frame-01 and frame-1, and document comparing across gaps in ticks. It's an analysis step, not a measurement. Wiring it into Dyno runs that record every tick is proposed as follow-up work for the plan's measuring milestone. Two Low Snyk findings on the script's own command-line paths were accepted, since it runs on a person's own files. An empty changeset (not in a published package); no owner paths. Checked by the orchestrator on the replay 8f16f5a9ad (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The Dyno wiring is filed as follow-up work.
- B. B. Hold it: Nothing merges; pops are still judged by hand.

Recommended: A. Merge it. It computes the plan's statistic exactly, with pinned tests, and changes nothing else.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
