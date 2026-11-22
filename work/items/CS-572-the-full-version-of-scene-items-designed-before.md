---
id: CS-572
title: The full version of scene items, designed before the first public API review
kind: work
state: planned
created: 2026-11-17
project: CS-437
needs: [CS-454]
tier_override: 3
---

The owner answered CS-454 on 2026-11-18: the full version of scene items is designed before the first public API review (CS-102), so the review names the scene model once. It's designed together with the content-source seam (CS-552), because "the globe as an item" here and "the globe as a source" there (CS-555) are the same question.

The scope, from `docs/design/scene-items.md` ("For a later brainstorm: the full version"): models and per-node transforms; `DrawHandle`, `MeshHandle` and `ModelPlacement` as items; the globe as an item; one tileset shared across worlds; groups; editing; and how far it follows USD's composition (prims, references, payloads). The owner leans toward USD's concepts, expecting USD, 3D Tiles and glTF to converge, with glTF 2.1's external references.

## Done when

- A design note in `docs/design/` (extending `scene-items.md`) names the full scene model: each of the parts above, and how it maps to USD's concepts, with what's taken, adapted or left out and why.
- It agrees with the content-source seam's design (CS-552) on the globe, and on how items and sources relate.
- It lists the API names and changes the public API review (CS-102) should take up, and raises the questions it can't settle as decisions for the owner.
- The owner has reviewed it.
