---
id: CS-557
title: MVT vector tiles load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-554, CS-261]
touches: [packages/next/src/**]
---


Mapbox Vector Tiles (MVT) load as a source through the seam. Related: CS-261 (wide lines, polygons and decals, with vector sources and vector tiles), which draws what this loads.

## Done when

- An `mvt` kind, a `tree` source on the kit over web Mercator or a declared tile matrix set. Its protobuf decodes on Jobs into `FeatureSink` rows, and it overzooms past the server's last level.
- The vector pipeline (CS-261) draws it, draped on terrain.
- A style in the styling language binds to its tags through its schema. Whether to accept MapLibre style JSON as a front end comes back as a question.
- A label that straddles a tile edge appears once, tested on a fixture.
- A pick returns the feature's properties and stable ID.
- Tests use recorded tiles, with no outside service.

## Note (2026-11-23)

`docs/design/styling-runtime.md` (section 13) answers the MapLibre question in principle: a Mapbox-style spec is a front end that lowers to Cesium IR, outside 2.0's core. A label that straddles a tile edge appears once through the runtime's label placement, keyed by the feature's key (section 7, CS-1137).
