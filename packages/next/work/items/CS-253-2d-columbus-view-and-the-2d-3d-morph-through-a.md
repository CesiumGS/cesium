---
id: CS-253
title: 2D, Columbus view and the 2D/3D morph through a world-spanning CRS root
kind: work
state: planned
created: 2026-11-13
project: CS-189
---

## Done when

Whole-world flat views drawn through a CRS root, antimeridian tiles drawn twice with an instance offset, with the 0.25–0.5 m mid-morph imprecision the owner accepted.

Detail: `docs/design/geometry-through-placement-review.md`; `packages/next/handbook/src/tabs/differences.tsx`.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

The owner, 2026-11-17: 2D and Columbus view are probably built from the transform graph's nodes (the smooth nodes, whose new name is CS-671).
