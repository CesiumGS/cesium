---
id: CS-166
title: "The ×10 cliff bands: confirm shadow acne under the warp and fix it"
kind: work
state: planned
created: 2026-11-13
project: CS-17
---

The ×10 cliff bands form a regular grid: shadow acne under the warp, not ridge shadows, skirts or stretched imagery. The plan lists the suspects (the shadow bias, the receiver normal) and the check to run.

It is also the Dyno harness's second acceptance case (`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, section 10B): run it as a Dyno study, with image checks on the ×1, ×4 and ×10 Zermatt scenes and a sweep of the normal offset and slope bias against shadows off, once CS-397 (image checks for development scenes) and CS-405 (the Studies page) land. It needs development-only shadow tuning knobs and a cascade-tint debug view, which are this item's own engine work. If the fix can't wait for those, fix it first and record the study from the same settings afterwards.

## Plan

`docs/superpowers/plans/2026-11-12-transform-graph.md`, its milestone table.
