---
id: CS-669
title: "drillPick: every hit along a pixel's ray, or every layer drawn at it"
kind: work
state: planned
created: 2026-11-17
project: CS-193
---

## Done when

- The ray queries take an all-hits option that returns every surface along a pixel's ray, sorted by distance, with draw, feature and accuracy.
- A pick reads every layer drawn at a pixel from the translucency compositor's per-pixel list in one readback. Both return one result shape, with no re-rendering.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
