---
id: CS-555
title: The globe's terrain and imagery load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/globe/**]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

The globe's terrain and imagery load through the same content-source seam as other sources, not as a special case or with the 3D Tiles module (the owner, 2026-11-16). Related: CS-454 (scene items, and the globe as an item), CS-279 (more terrain and imagery providers).

## Done when

- Set by CS-552's plan.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
