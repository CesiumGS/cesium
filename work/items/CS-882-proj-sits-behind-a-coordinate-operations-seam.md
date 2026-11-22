---
id: CS-882
title: "PROJ sits behind a coordinate-operations seam: @cesium/crs-proj splits from @cesium/crs"
kind: work
state: planned
created: 2026-11-21
project: CS-615
needs: [CS-835, CS-808]
touches: [packages/next/src/engineering/**, packages/next/src/proj/**, packages/next/test, packages/next/api/surface.txt]
---

The owner's call (2026-11-21): today's `/proj` entry point becomes `@cesium/crs`, and PROJ becomes `@cesium/crs-proj`, one provider of coordinate operations. CS-834's package map suggests this item.

Source: CS-834's report, relayed by orch-11. Why now: after the move (CS-835), `@cesium/crs` should depend on no adapter. Rough size: medium. Decider: the executor, within the map. Filed: 2026-11-21.

## Done when

- `@cesium/crs` defines a coordinate-operations seam, and `@cesium/crs-proj` implements it with PROJ's WebAssembly, loaded through the data-resource provider (CS-808) with its pins checked.
- `@cesium/crs` depends on no adapter. The package rule's test fails if it does.
- Today's results are unchanged: the PROJ and engineering tests pass, and `npm run test:data` passes.
- `npm run surface` is run, and `api/surface.txt` is committed.
