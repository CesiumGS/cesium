---
id: CS-1215
title: Merge CS-578, a mesh editing sample beside the CSG sample
kind: decision
state: planned
created: 2026-11-24
project: CS-579
decider: owner
---

## Question

Merge CS-578 into main? It adds the mesh editing example: drag a mesh's vertices, edges and faces, with undo, keyboard nudges and a cost readout, beside the CSG sample.

The example (examples/mesh-editing/) drags vertices, edges and faces in the site's reference frame, with one undo step per drag, Escape to cancel, keyboard nudges in 0.1 m steps, and a readout of what each edit costs, from the page's own counters (DESIGN.md says so, and marks the depth-bias and billboard claims as expected, not measured). A Sonnet review found one Important: a Shift-drag along a face's normal flew away when the view ran nearly along that normal. The fix holds the drag past about 11 degrees from parallel, says why on the status line, and caps every offset at three mesh diagonals. A fresh scoped review found it closed, with no new Important. 29 tests, 12 of 12 planted faults caught; a headless browser check in both themes, at 380 px, keyboard only and with reduced motion, with only the gallery's usual console messages. It uses the public API only. Its tests sit beside the CSG sample's (test/meshEditing.test.ts), outside its listed touches. No owner paths. Three follow-ups it proposed stand (in-place mesh writes, a staging ring for small uploads, a Dyno scene that drags). Checked by the orchestrator on the replay 7187202cab (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`.
- B. B. Hold it: Nothing merges; the example stays on its branch.

Recommended: A. Merge it. It meets the done-when, the review's Important is closed and checked, and the page passes the example checks.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
