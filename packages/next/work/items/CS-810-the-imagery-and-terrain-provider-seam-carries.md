---
id: CS-810
title: The imagery and terrain provider seam carries any tiling scheme, renewable credentials and per-tile credits
kind: work
state: planned
created: 2026-11-21
project: CS-191
needs: [CS-809]
touches: [packages/next/src/globe/ImageryProvider.ts, packages/next/src/globe/TerrainSource.ts, packages/next/src/globe/**, packages/next/src/io/worker.ts, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

`ImageryProvider` (`src/globe/ImageryProvider.ts:9-19`) is a thin seam. It offers:

- `tileUrl(x, y, level)`, with fixed headers;
- only the web Mercator and geographic schemes;
- attributions only;
- ion's defaults, imported into the same file.

Terrain has no provider contract of its own; it's a `TileSource` inside `Globe extends Tileset3D`. The owner wants WMTS, the other OGC services and STAC catalogs such as Planetary Computer to plug in. They chose to put the seam in alpha.1 and the providers in beta.1. The providers are CS-279, which is already in CS-668 for beta.1.

Source: the owner's review of 2.0's seams with the chief of staff, 2026-11-21. A read of the code found about 25 direct `fetch` call sites and no shared provider. Why now: the providers can't be written until the seam's shape is fixed. Rough size: medium. Decider: the executor. Filed: 2026-11-21.

## Done when

- The imagery provider contract adds:
  - `fetchTile(x, y, level, signal)` returning bytes or a decoded image, alongside `tileUrl`;
  - tiling schemes from OGC tile matrix sets, not only the two built in;
  - bounding-box requests for WMS and OGC API Maps;
  - renewable credentials through CS-809;
  - per-tile credits, as Bing's `tileCredits` needs.
- A terrain-provider contract exists, so terrain no longer has to be a tileset. OGC API Coverages and quantized mesh both fit it.
- Ion's defaults move out of `ImageryProvider.ts` and into the ion module (CS-269).
- Today's three providers (URL template, ion TMS, Bing) move onto the new contract, and their parity and imagery tests are unchanged.
- One sample provider shows a non-XYZ scheme, such as a WMTS tile matrix set read from a fixture.
- `npm run surface` is run, and `api/surface.txt` is committed.
