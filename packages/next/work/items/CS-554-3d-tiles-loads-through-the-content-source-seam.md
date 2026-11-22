---
id: CS-554
title: 3D Tiles loads through the content-source seam, with a @cesium/next/tiles entry point
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552]
touches: [packages/next/src/streaming/**, packages/next/package.json]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

3D Tiles, today's `src/streaming/` code, moves behind the content-source seam, and a `@cesium/next/tiles` entry point exports its API, so an application imports only what it uses. Related: CS-553 (the bundle baseline it should improve on), CS-272 (3D Tiles format gaps), and the styling language's split from `FeatureStyle` in `docs/design/modular-renderer.md`.

## Done when

- `Engine.loadTileset`, `addTileset` and `addTerrain` move out of `Engine` (`src/scene/Engine.ts:1054-1180`), and `Globe` stops extending `Tileset3D`. 3D Tiles and terrain then become sources behind the seam, not the core's structure. Added 2026-11-21, from the owner's review of 2.0's seams.
- Set by CS-552's plan.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
