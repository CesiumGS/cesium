---
id: CS-559
title: USD loads through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/**]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

USD loads as a source through the seam. Related: CS-304 (`BrepSource.fromUsd`) and CS-305 (the B-rep tiler, USD to 3D Tiles 2.0), which cover USD's B-reps.

## Done when

- Set by CS-552's plan.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
