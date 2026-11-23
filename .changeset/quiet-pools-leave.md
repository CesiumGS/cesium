---
"@cesium/core": major
"@cesium/next": major
"@cesium/ui": patch
---

Engine internals left `@cesium/core`'s entry, and the umbrella's with it. `SlicePool` moved to `@cesium/core/internal`, which isn't public API. These are now internal to core, with no public replacement: `BASE_BINDING_LIMITS`, `BASE_CAPACITY_LIMITS`, `assembleMeshCaps`, `meshPlane`, `rayHitRegions`, `sectionTile`, `tileBounds`, `triangulateRegion`, `MeshCapGeometry`, `MeshCapPlane`, `SectionJob`, `runSection`, `LEVEL_ZERO_ERROR` and `resolveUri`. Use `MeshCaps` and `BrepCaps` for caps. `rayHitRegions` has no public replacement: a host can't test a ray against `MeshCapReport.regions`. For rays, use `Engine.queries` or `terrainQueries`: `castTerrainRay`, `TerrainRayOptions` and `TerrainRayResult` are gone from the entry. That holds for the verdict only: `castTerrainRay`'s `endTolerance`, `margin` and `known` have no equivalent on `terrainQueries`.

`SectionClient`, `SectionClientOptions` and `SectionWorkerLike` joined the entry, so a host can section a b-rep off the main thread: pass a `SectionClient` as `BrepCaps`' `runner`.

Some names stay public only because public signatures need them: `LimitsTier`, `SliceUser`, `ElementCap`, `SectionRunner`, `SectionRequest`, `SectionOutcome`, `TerrainRayPatch`, `TerrainRayTarget` and `TerrainRayTile`.

The adapters (ion, iTwin, Bing, URL templates, 3D Tiles and glTF) stay in `@cesium/core` for now. Each moves to its own package when its seam lands. Every package name, and every export name, may still change until beta.1's API review (CS-973 C).
