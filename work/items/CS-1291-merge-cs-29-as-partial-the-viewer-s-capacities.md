---
id: CS-1291
title: Merge CS-29 as partial, the Viewer's capacities from the engine
kind: decision
state: planned
created: 2026-11-24
project: CS-8
decider: owner
---

## Question

Merge CS-29's first part into main as partial? The Viewer's world takes the engine's own capacities within the device's limits, and a maxInstances the device can't give is reported as a limited notice. Its shadow and ambient-occlusion overrides stay until you decide the engine's default look (a separate question).

What it does: the Viewer no longer sets its own capacities (65,536 draws, 8,192 materials, 768 and 384 MiB); the world takes the engine's defaults (262,144 draws, 65,536 materials, 1 GiB vertex and 512 MiB index), each bounded by the device's storage binding, as the plan's question 6 decided. So honest content gets more room, not less. The one capacity the Viewer exposes, maxInstances, is reported when the device can't give it: recorded in engine.errors, warned once, thrown under strict. Three tests, each failing under its mutation. The look is unchanged: the image checks show osm-philadelphia identical, and terrain-rainier's only difference is a thin horizon strip that a second branch run matched to base (streaming noise; runs 2026-11-24T13-31-42-716Z-mac-apple, 13-32-52-810Z and 13-34-06-073Z). A Sonnet review found no Important. What stays open: the done-when also asks that the Viewer set no shadow or ambient-occlusion override and match a bare engine's look. That needs the engine's own default for both turned on (the catalog says on, View.ts says off), which changes about 30 parity, bench, example and handbook pages and 14 tests. That's a separate question for you, so the item stays in progress. Minor: a maxInstances near the old ceiling on a small device now clamps, and that's reported. Checked by the orchestrator on the replay ef4dce7fd9 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it as partial: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The item stays in progress for the default-look question.
- B. B. Hold it: Nothing merges until the default-look question is settled and the overrides can go too.

Recommended: A. Merge it as partial. The capacity part stands on its own, gives honest content more room, reports its one clamp, and leaves the look unchanged.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
