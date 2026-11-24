---
id: CS-1265
title: Merge CS-165, the runaway at α 1 under a steep warp, diagnosed
kind: decision
state: planned
created: 2026-11-24
project: CS-17
decider: owner
---

## Question

Merge CS-165's findings into main? At α 1 under a steep warp, terrain selection converges; the runaway is the globe's imagery, which needs more slices than the device has and keeps fetching tiles it already fetched. It's docs only: the plan, the handbook and the item.

Diagnosed with a probe that read counts, not timings, under the gpu lock, from the vertical exaggeration example's valley view with the inspector recorder on. Terrain: at ×10 and α 1 it stopped at 10,533 tiles, with no new terrain requests in the last 30 s of 300 s. The stretch is the same at every level (slopeMax 10, fit error 0), so no selection metric grows as tiles refine. Imagery: every drawn terrain tile needs its own slice, a layer of one texture array capped at maxTextureArrayLayers (2,048 on this Mac's adapter). ×10 at α 1 needed 11,406 slices. Past the ceiling the layer fetches the same tiles again: at ×4, once terrain stopped, requests rose from 4,729 to 10,284 in 41 s with no new imagery tile. The cache isn't the cause. α 0.3 (the default) and α 0.75 settle under the ceiling. Not pinned down: which slices churn and why; the tenfold reach per level is inferred. The Dyno sweep meant to record it (m-2026-11-24T15-16-34-203Z-c933) was still waiting for quiet when the executor finished, and stays queued under CS-165. Changed: the transform-graph plan's α 1 note, the handbook's selection tab and overview row, and the item's Found section. Your design question (what gives at the slice ceiling) and two proposed bug items, refetching past the ceiling and decoded sources beyond MAX_SOURCES, go to the chief of staff. The orchestrator read the diff: one handbook line says 'for the owner to decide', which reads as internal process to an outside reader, and could say 'is open'. Empty changeset; no owner paths. Checked on the replay b7bd043e60 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The handbook and plan state the cause.
- B. B. Hold it: Nothing merges; the handbook keeps saying the cause isn't found.

Recommended: A. Merge it. It replaces 'cause not found' with a reproduced diagnosis, and changes no code.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
