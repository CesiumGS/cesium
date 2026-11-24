---
id: CS-1261
title: Merge CS-71, setShader swaps a model's shader when it's ready
kind: decision
state: planned
created: 2026-11-24
project: CS-11
decider: owner
---

## Question

Merge CS-71 into main? ModelPlacement.setShader(next, { swap: "whenReady" }) keeps a model drawing with its current shader until next's pipelines for every pass it draws in are ready, so the last good material stays on screen.

How it works: one shared list of pipeline keys (render/world/surfaceKeys.ts) now drives both the recording of every pass and the swap's readiness, so they can't drift apart. The swap waits for opaque, shadow, prepass, depth, the translucent passes (BLEND, blended-only and ghosted clips) and clipped variants when the world has a clip, per route, for batches that are shown or cast shadows; it only warms pick and height. A failure in a key the content waits for keeps the current shader and is reported once through Engine.errors. A later swap supersedes an earlier one, a swap to the same shader does nothing, and removing the model mid-swap leaks nothing. The refactor changes no pipeline key for content that isn't swapping (checked branch by branch). An Opus review found three Importants: translucent passes never probed, batches never recorded blocking the swap forever, and a routed failure unseen. They were fixed structurally in one round, and a scoped Opus check found all closed, with no new Important and the Minors done. Follow-ups, not blockers: ask waited keys before warm ones, so routed swaps aren't delayed; the wait set is wider than what the content draws (every translucent method, clipped keys whenever any clip exists), so a failure in an undrawn pipeline can abandon a valid swap; content no view shows takes next at once, which CS-72 (Tileset3D.setShader) must account for. A marked hook takes and releases the next shader once CS-972 merges. No owner paths; api/surface.txt unchanged. Checked by the orchestrator on the replay f8ad16f0eb. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. CS-72 can then start.
- B. B. Hold it: Nothing merges; a model's new shader still draws the default material until its pipelines are ready.

Recommended: A. Merge it. Both reviews' Importants are closed, the shared key list stops the probe and the draw path from drifting, and unswapped content is unchanged.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
