---
id: CS-554
title: 3D Tiles loads through the content-source seam, with a @cesium/next/tiles entry point
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-847, CS-553]
touches: [packages/next/src/streaming/**, packages/next/package.json]
---

Proposed under the owner's call to load every kind of source through one module seam (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`). It stays proposed until the seam's design and plan (CS-552) set its scope; that plan turns it into a planned item with its "Done when".

3D Tiles, today's `src/streaming/` code, moves behind the content-source seam, and a `@cesium/next/tiles` entry point exports its API, so an application imports only what it uses. Related: CS-553 (the bundle baseline it should improve on), CS-272 (3D Tiles format gaps), and the styling language's split from `FeatureStyle` in `docs/design/modular-renderer.md`.

## Done when

- `Engine.loadTileset`, `addTileset` and `addTerrain` move out of `Engine` (`src/scene/Engine.ts:1054-1180`), and `Globe` stops extending `Tileset3D`. 3D Tiles and terrain then become sources behind the seam, not the core's structure. Added 2026-11-21, from the owner's review of 2.0's seams.
- 3D Tiles is the `3d-tiles` kind, exported by the tiles entry point (named per D5). `loadTileset(engine, url)` stays as its shorthand, and `world.add(tileset)` works as today.
- The tile-tree kit is extracted from `Tileset3D`: `BudgetedSelection`, `Stepwise`, `TouchOrder`, eviction, LOD transitions and geomorphs, curvilinear maps, occlusion and casters. 3D Tiles and the globe both use it, and the globe uses it without `Tileset3D`.
- Its content decodes on `Jobs.submit`, with the want's priority, not plain worker requests.
- Its requests and cache go through the budget arbiter. `cacheBytes` stays as a cap on the tileset's share of the engine's byte budget.
- `FeatureStyle` and the metadata-to-property mapping move into the tiles module. The styling language's compiler stays in core.
- Credits come in with content, and the engine keeps one credit list across sources.
- Core imports nothing from the tiles module, and the import-boundary test enforces it. `scripts/checkBundle.mjs` shows what an application with no tilesets saves, against CS-553's baseline, with both commits named.
- The tiles parity suites (`dyno lab`) give the same results as the previous commit. A Dyno measurement of tile loading shows no regression, with run IDs cited.
- `npm run surface` is run, and `api/surface.txt` is committed.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).
