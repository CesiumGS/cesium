---
id: CS-102
title: The public API review, with the protocol table and the façade's constraints
kind: work
state: planned
created: 2026-11-13
project: CS-437
needs: [CS-101, CS-430, CS-431, CS-432, CS-433, CS-454, CS-567, CS-572, CS-834]
---

The public API review, with CS-101's map and the façade's constraints. It also designs observed value types for in-place writes (three.js-style `camera.position.x = 5` becoming commands, owner 2026-11-13) and checks the API against three.js, Babylon.js and MapLibre idioms. Needs CS-101. The review collects the renames and open API questions the design notes left for it.

## Done when

- Set by its plan, and also, from the owner on 2026-11-21: the review covers the package and seam map (CS-834) together with the API, so package names, seams and API names are settled as one.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.

## Notes (2026-11-22)

- A first pass of this review, by a Fable reviewer, is in `fable-review-api.md` in the chief of staff's shared notes. It covers the surface map, the systemic problems and a proposed order for this review.
- The owner's answers: tiers and names in one review (CS-975 B); `dispose()` everywhere (CS-976 A); alpha.1's packages may be renamed until this review (CS-973 C).

## Questions from CS-848 (2026-11-24)

CS-848's fix round (render features register passes in named slots) raised five API questions for this review, each with the executor's recommendation:

1. Splat picks return their own shape (`SplatPick`, `RenderFeaturePick`, with a string ID) beside CS-832's `PickResult`. Recommended: return `PickResult` once CS-815's stable IDs reach splats, and mark these provisional until then.
2. Free functions (`registerRenderFeature`, `pickRenderFeatures`) or methods (`engine.renderFeatures.register(world, f)`, `world.renderFeatures`)? Recommended: the method form, decided with the rest of the engine's surface.
3. Passes restate their slot's reads and writes, which must match exactly. Recommended: derive them from the slot, or let a pass declare less.
4. `RenderFeatureRayAdapter` is exported but no cast calls it, and `RenderFeatureRayHit` mixes `t` (a share of the segment) with accuracy in meters. Recommended: unexport it until casts call it (CS-1313), or settle the units now.
5. The ground and overlay slots are exported and always refused. Recommended: keep them, documented as reserved (CS-1311, CS-1312).
