---
id: CS-558
title: Esri services load through the content-source seam
kind: work
state: proposed
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/**]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

Esri services load as sources through the seam, for example feature, tile and I3S scene services; which ones, and in what order, is for CS-552's plan.

## Done when

- Set by CS-552's plan.
