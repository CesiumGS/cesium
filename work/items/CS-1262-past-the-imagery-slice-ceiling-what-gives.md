---
id: CS-1262
title: "Past the imagery slice ceiling, what gives: terrain detail, imagery detail, or packing?"
kind: decision
state: planned
created: 2026-11-24
project: CS-17
decider: owner
---

> **Decision for the owner.** Source: CS-165 (Track down the runaway at α 1 under a steep warp), relayed by orch-11 (2026-11-24). Asked because of its blast radius: every globe view past the ceiling changes. Filed 2026-11-24.

## Question

At α 1 under a steep warp, terrain selection converges. But the globe's imagery needs one slice per drawn terrain tile. Slices are layers of one texture array, capped at `maxTextureArrayLayers`, which is 2,048 on this Mac. Valley ×10 at α 1 needs 11,406 slices, and ×4 at α 1 needs about 2,330. What should give past the ceiling?

## Options and recommendation

- A. Raise terrain's memory-adjusted error under imagery pressure, as the cache budget does. Every globe view past the ceiling settles coarser.
- B. Past the ceiling, tiles draw an ancestor's imagery and don't churn. Terrain stays exact, and imagery is coarser where it overflows.
- C. Composite several terrain tiles' imagery into one slice.

**Recommendation (the executor's):** B first. Add A only if the image or memory at the ceiling calls for it.

Related: CS-1263 and CS-1264 are bugs whatever this decides. CS-441 counts imagery slices in the byte budget. CS-507 raises a `support` notice at the imagery slice ceiling.

## Answer

Open.
