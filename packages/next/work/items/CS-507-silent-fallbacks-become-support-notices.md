---
id: CS-507
title: Silent fallbacks become support notices
kind: work
state: planned
created: 2026-11-15
project: CS-8
needs: [CS-23]
---

Each fallback that is silent today raises a support notice, as the engine-profiles plan's section 4 table lists. Split from CS-23 on 2026-11-15, so the milestone's clause about notices has an item of its own.

## Done when

- Each row of the plan's section 4 table raises its `support` notice on `Engine.errors` when its fallback happens: glare's auto, moments without `float32-blendable`, the ambient occlusion pixel cap, World capacity clamps, the imagery slice ceiling, and screen-space error raised over budget.
- Each warns once in the console where the notice table says to, and throws under `strict`.
- Accuracy-class notices state their effect on accuracy.
- Glare is migrated to the notice, and glare and translucency parity are unchanged.

## Plan

`docs/superpowers/plans/2026-11-13-engine-profiles.md`, section 4.
