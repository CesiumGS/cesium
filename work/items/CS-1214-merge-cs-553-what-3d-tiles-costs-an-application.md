---
id: CS-1214
title: Merge CS-553, what 3D Tiles costs an application that doesn't use them
kind: decision
state: planned
created: 2026-11-24
project: CS-191
decider: owner
---

## Question

Merge CS-553 into main? It records the content-source seam's baseline: the bytes of streaming code a globe-only page pulls in, file by file, and its cold-start run, for CS-554 to compare against.

A globe-only Viewer page loads 26 modules of streaming code, 150.1 KB rendered (after tree shaking, before minifying), 6.2% of the page: streaming/ 25 files, tiles/ none, one tile parser. `scripts/checkBundle.mjs` now prints that report on its existing build; it adds nothing to the gate's problem list and changes no line the handbook parses (a test pins that). The record, `docs/design/streaming-cost-baseline.md`, names the commit, the method, the command to repeat it, and the cold-start run 2026-11-24T10-59-19-411Z-mac-apple in words (values stay in Dyno's store); that run reads failed because Dyno's own first frame is over its 1,400 ms budget, a separate follow-up. A Sonnet review found no Important; its Minors (guard the new report with a try/catch so a classifier error can't stop the gate's checks, anchor one path match, three test cases, two wording fixes in the record) fit CS-554, which reruns this baseline. No owner paths. Checked by the orchestrator on the replay eaacc88755 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. CS-554 then has its baseline.
- B. B. Hold it: Nothing merges; CS-554 has no baseline to compare with.

Recommended: A. Merge it. It meets the done-when, changes no gate's result, and the review found nothing Important.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
