---
id: CS-454
title: "What is the full version of scene items: references, groups, the globe as an item, and how close to USD?"
kind: decision
status: Planned
created: 2026-11-14
project: CS-437
decided-by: owner
---

## Question

What is the full version of scene items: models and per-node transforms, `DrawHandle`, `MeshHandle` and `ModelPlacement` as items, the globe as an item, one tileset shared across worlds, groups, editing, and how far this should resemble USD's references? The owner leans toward USD's concepts (prims, references, payloads, composition), anticipating a convergence of USD with 3D Tiles and glTF, and glTF 2.1's external references. The notes say to take it up "before or with the API review".

Detail: `docs/design/scene-items.md`, "For a later brainstorm: the full version".

## Options and recommendation

- Brainstorm it before the first public API review, so the review names the scene model once.
- Brainstorm it with the first review.
- Leave it to a later review, and keep today's scene items as they are.

Recommendation: before the first review: the review (CS-102) needs this answer, because renaming the scene model twice is the cost the review exists to avoid.

## Answer

Open.
