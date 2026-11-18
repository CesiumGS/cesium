---
id: CS-454
title: "What is the full version of scene items: references, groups, the globe as an item, and how close to USD?"
kind: decision
state: done
created: 2026-11-14
project: CS-437
decider: owner
answer: "Brainstorm it before the first public API review, so the review names the scene model once."
rationale: "owner, 2026-11-18: before the API review, together with the content-source seam's design (CS-552)"
answered_at: 2026-11-18T02:49:11.000Z
answered_via: main-session
answered_by: owner
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

Recorded in the front matter: the owner's answer through the question tool in the chief of staff's session. It wasn't asked through `hitld rights ask`, so it has no check code or ledger entry.
