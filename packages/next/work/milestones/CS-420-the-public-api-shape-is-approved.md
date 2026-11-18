---
id: CS-420
title: The public API shape is approved
kind: milestone
state: planned
created: 2026-11-14
project: CS-437
outcome: "Every public member is mapped and reviewed against the façade's constraints and other engines' idioms, and the owner has approved which changes to make."
constraints: [CS-101 c?, CS-102 c?, CS-430 c?, CS-431 c?, CS-432 c?, CS-433 c?, CS-438 c?, CS-454 c?, CS-572 c?]
---

## Done when

To shape: clauses (c1, c2…), each checkable, and the independent check.

## Notes

Migrated on 2026-11-14 from the milestone "map and review" of CS-13 (its `milestones` list and its items' `milestone` key). Its 2 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 to what it is: the public API review in the Earth-to-Moon spec (`docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2), sequenced with the worker-mode façade (`docs/superpowers/plans/2026-11-13-worker-facade.md`): CS-101's protocol table is its map of the surface, and CS-102 is the review. Section 15.2 also asks for promotions and demotions, stability tiers as TSDoc tags, measurement and tools as their own module, the camera chain's layers checked, and the WebGPU seams audited; those are CS-430 to CS-435 (2026-11-14): four inputs the review needs, and two moves that follow the owner's approval. It covers the whole public surface, the façade (CS-13) and Earth to Moon (CS-188) among it, so it moved on 2026-11-14 to its own project, The public API reviews (CS-437), where later reviews follow as milestones of their own.

Renamed on 2026-11-14 from "The first public API review" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.

The two moves that follow the approval, the stability tiers (CS-434) and the measurement module's seam (CS-435), moved on 2026-11-15 to their own milestone, "The approved API changes are made" (CS-457), so this one closes at the owner's approval (CS-438) and what waits on the approval no longer waits on the moves.

CS-454 joined this milestone on 2026-11-15, on the owner's answer: the review (CS-102) already needs it.
