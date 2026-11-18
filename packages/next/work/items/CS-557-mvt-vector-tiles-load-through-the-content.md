---
id: CS-557
title: MVT vector tiles load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/**]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

Mapbox Vector Tiles (MVT) load as a source through the seam. Related: CS-261 (wide lines, polygons and decals, with vector sources and vector tiles), which draws what this loads.

## Done when

- Set by CS-552's plan.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
