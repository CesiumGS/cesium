---
id: CS-555
title: The globe's terrain and imagery load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-554, CS-810, CS-848, CS-842]
touches: [packages/next/src/globe/**]
---


The globe's terrain and imagery load through the same content-source seam as other sources, not as a special case or with the 3D Tiles module (the owner, 2026-11-16). Related: CS-454 (scene items, and the globe as an item), CS-279 (more terrain and imagery providers).

## Done when

- Terrain is a `tree` source on the kit (quantized mesh and the ellipsoid), with heights in `queries`. `TileSource`'s terrain members leave the tileset, and the 8 `isGlobe` checks become capability checks (`queries`, receivers).
- Imagery is a `derived` source through CS-810's provider contract. It writes images with footprints to `RasterSink`.
- Compositing is a first-party render feature in the frame graph, replacing `WebGpuImageryCompositor`'s own command encoder. The boundary test's exceptions for `GlobeImagery` and `SlicePool` are gone.
- The globe is content per D2: one terrain source and ordered imagery layers, placed per body as an item.
- The Viewer still gets its defaults, from the ion module once CS-269 lands.
- The globe and imagery parity suites give the same results as the previous commit, and a Dyno measurement of terrain loading shows no regression, with run IDs cited.
- `npm run surface` is run, `api/surface.txt` is committed, and the handbook's globe pages say how a terrain or imagery source plugs in.
