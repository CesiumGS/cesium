---
id: CS-1267
title: Merge CS-56 as partial, tables and the bounded search in Cesium IR
kind: decision
state: planned
created: 2026-11-24
project: CS-10
decider: owner
---

## Question

Merge CS-56's first part into main as partial? Cesium IR gains table columns and a bounded search, so the 39-line road compiles to the same program as a 3-element alignment with only table data differing, and a row window bounds each draw's data. Done-whens 4 and 5 stay open as follow-ups.

Met:

- Done-when 1: the road and a 3-element alignment get the same key, WGSL, GLSL and layouts for windows 0 to 2.
- Done-when 2: a window rule, written in the test, gives the road's 60 m draws 148 floats each, against 416 unrolled.
- Done-when 3: the corridor baseline holds on the compiled table route in float64. The GPU readback agrees with float64 to 1.04e-5 m against a 1e-4 m bound at 8 rows, offsets to about 660 m. That's the float32 path's precision at those rows, not accuracy at ±1.5 km.
Nothing reads a table on the GPU yet: search and tableGet are computed per draw in float64 on the CPU, and the generic emitters refuse a column. Routes with no table compile as before.
Two Opus reviews. The first found that a branch on a table value emitted undeclared WGSL names under a row window, and that the search was treated as continuous (a kink) where the road's polyline jumps 1,410 m at a corner. One round fixed both: the search is a step unless a declared continuity check passes at probe offsets. The scoped check found both closed. One stated limit: the corridor's three probes bound the gap only because its output is affine in offset, and say nothing exact past ±1.5 km.
Open: done-when 4 (lattices and flattens share a pipeline) and 5 (the example's first warped draw not held by the corridor's compile) are follow-ups the chief of staff filed, along with Cesium IR format 0.2 as your decision.
The executor couldn't run the gated focused set (transformGolden and the route tests) or the repo-wide type checks behind Dyno's pause; the orchestrator's cheap gates on the replay cover them. No owner paths; FORMAT.md, ir/index.ts and api/surface.txt unchanged. The item stays in progress. Replay ea2603fba8. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it as partial: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The ir/ and transform/ items waiting on it can start.
- B. B. Hold it: Nothing merges until done-whens 4 and 5 are done too; the ir/ and transform/ items keep waiting.

Recommended: A. Merge it as partial. Done-whens 1 to 3 are met and checked, both reviews' Importants are closed, nothing reaches the GPU yet, and it unblocks the IR and transform-graph queue.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
