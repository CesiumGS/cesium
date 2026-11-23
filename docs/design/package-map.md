# 2.0's packages and seams: the package map (design, 2026-11-21)

**What this holds:** The map of every package 2.0 publishes, for CS-834: what kind each is, what it holds, which seams it owns or implements, the directory layout, the rule that replaces `layerOf` in the import-boundary test, the full name list for CS-616, and the plan for CS-835, the move itself. Nothing here is built. The owner reviews it together with the public API review (CS-102), so that package names, seams and API names are settled as one.

**The owner's choices it builds on (2026-11-21).** Adapter packages take seam prefixes (`source-`, `loader-`, `imagery-`, `data-`, `geocoder-`). Today's `/proj` entry point becomes `@cesium/crs`, with PROJ as `@cesium/crs-proj`, one provider of coordinate operations. The StrataKit widgets package is `@cesium/ui`. Experimental is a 0.x version line outside the umbrella (CS-681, answer B), not a kind of package.

**What it read.** Main at `026520244f`. CS-552's design, [content-source-seam.md](content-source-seam.md), on `hitld/CS-552-content-source-seam` at `8e88dcdb76`. CS-809 (fetch and credentials) on `hitld/CS-809-fetch-provider` at `58561a693d`, then `2e0dd50861`. CS-814 (camera records) on `hitld/CS-814-camera-records` at `0301e5f903`. The items CS-102, CS-552 to CS-559, CS-616, CS-617, CS-681, CS-806, CS-808 to CS-818, CS-831, CS-835 and CS-837. 1.x's `packages/core` and `packages/gltf`, read only. The import counts below come from a read of every relative import under `packages/next/src` and `widgets/` on main.

**What to read first.** "The map in one page", then "Decisions for the owner". The seam table is the reference; the move plan is for CS-835's executor.

## The map in one page

Three kinds of package, and one rule between them: **a capability package never depends on an adapter or on the umbrella.**

- **Capability packages** define the stable API and own the seams they consume. There are six: `@cesium/core`, `@cesium/time`, `@cesium/frames`, `@cesium/crs`, `@cesium/measure` and `@cesium/ui`.
- **Adapter packages** implement seams, and an application can leave each one out or swap it. Each is named by the seam it implements: `source-*` (streaming content sources), `loader-*` (format loaders and decoders), `imagery-*` (imagery and terrain providers), `data-*` (data-resource providers), `geocoder-*` (geocoding services), `crs-proj` (coordinate operations) and `tiling-native` (an outside tiling engine). A service bundle that spans seams keeps a plain name: `@cesium/ion`, `@cesium/itwin`, `@cesium/esri`.
- **The umbrella,** `cesium`, depends on the standard set and re-exports it. It is the one place that wires defaults: which source kinds, resolvers, decoders, imagery and terrain an application gets when it chooses nothing.

```text
                       cesium  (the umbrella: wires defaults, re-exports)
                         │
     ┌───────────────────┴───────────────────────┐
     │ adapters                                   │
     │ source-*  loader-*  imagery-*  data-*      │
     │ geocoder-*  crs-proj  tiling-native        │
     │ ion  itwin  esri                           │
     └───────────────────┬───────────────────────┘
                         │ implement seams of
     ┌───────────────────┴───────────────────────┐
     │ capability packages                        │
     │   ui ──────────────┐ (any capability)      │
     │   measure → crs → frames → time → core     │
     └────────────────────────────────────────────┘
```

Inside the capability packages the order is today's (spec section 7.7, enforced by `test/importBoundary.test.ts`): `core` depends on no sibling; `time` on `core`; `frames` on `time` and `core`; `crs` on `frames`, `time` and `core`; `measure` on those four; `ui` on any of them. Adapters depend on capability packages and, where it helps, on other adapters (`source-3d-tiles` on `loader-gltf`). Nothing depends on the umbrella.

**Experimental is a version line.** A package that isn't ready at beta.1 ships on a 0.x line, outside the umbrella, and a user adds it by name (CS-681). Where a capability can't split out, its members carry `@experimental` inside a stable package. Any package in the map can start on the 0.x line; which ones do is set at beta.1, not here.

## Every package

### Capability packages

| Package           | Holds                                                                                                                                                                                                                                                                                                                                                                                                                          | From today's folders                                                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@cesium/core`    | The engine, worlds, views, scene items and the camera; the renderer and the GPU layer; streaming's host, the tile-tree kit and the request scheduler; the globe's composition; queries; the transform graph and its built-in transforms; styling and Cesium IR; B-reps, vectors and points; profiles; the worker-mode protocol. The base seams everyone uses (fetch, data resources) and the shared utilities (see decision 1) | `scene`, `camera`, `render`, `gpu`, `shaders`, `lighting`, `atmosphere`, `streaming`, `globe`, `tiles`, `io`, `ir`, `query`, `transform`, `transforms`, `georeference`, `geometry`, `brep`, `vector`, `profile`, `thread`, `core`, `math` |
| `@cesium/time`    | Instants, leap seconds, the clock, the Sun and the Moon, formatting, TDB from TT                                                                                                                                                                                                                                                                                                                                               | The files of `time` that `TIME_FILES` lists today                                                                                                                                                                                         |
| `@cesium/frames`  | The reference-frame catalog, Earth orientation (the IAU 2006/2000A series and the EOP parser), ephemerides, trajectories, the frames resolver and the coordinate-service contract                                                                                                                                                                                                                                              | `frames`, `ephemeris`, `trajectory`, and the rest of `time` (`time/erfa` but its TDB files)                                                                                                                                               |
| `@cesium/crs`     | CRS definitions and WKT2, georeferencing and declared placements, engineering frames, alignments, placement, design picks and snapping, grid factors, the reprojection curvilinear map                                                                                                                                                                                                                                         | `engineering`, `proj`                                                                                                                                                                                                                     |
| `@cesium/measure` | Measurements and their stated accuracy                                                                                                                                                                                                                                                                                                                                                                                         | `measure`                                                                                                                                                                                                                                 |
| `@cesium/ui`      | The widgets library on StrataKit, with React as its peer dependency, and the Viewer composed from it                                                                                                                                                                                                                                                                                                                           | `widgets`                                                                                                                                                                                                                                 |

Two edges into `core` shape the base (decision 1). `time` imports `Emitter`, `SceneClock` and the math utilities. `frames`, `crs` and `measure` import core's neutral contracts: `Body`, `FrameResolver`, routes, `Rig`, bulk work, the transform graph's nodes and queries, and the types of `Engine`, `World` and `View`. In all, 35 core files are imported from outside core today, 21 of them for values. Most of their names are already public (`Body`, `FrameResolver`, `Rig`, `SceneClock`, `Emitter`, `TransformNode`).

### Adapter packages

**Their code exists today, inside core.** Each moves out when the seam it implements is built, which is why most can't move in CS-835 (see "What can't be a pure move").

| Package                          | Implements                                                                                                               | Today                                                                                          | Moves with                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | -------------------------- |
| `@cesium/crs-proj`               | Coordinate operations (`crs`'s seam, below) and the coordinate service (`frames`'s)                                      | `engineering/proj*.ts`, `gridCatalog.ts`, PROJ's WebAssembly                                   | A follow-up item (below)   |
| `@cesium/ion`                    | An asset resolver, a credential provider, a data-resource provider, ion's imagery (TMS), the Bing lookup, the Moon's map | `io/ion.ts`, `io/moonMap*.ts`, ion's defaults in `globe/ImageryProvider.ts`                    | CS-269, CS-810             |
| `@cesium/itwin`                  | An asset resolver; later a writer for changesets (CS-831)                                                                | `io/itwin.ts`                                                                                  | CS-269's interface         |
| `@cesium/source-3d-tiles`        | A source kind (`3d-tiles`) on the tile-tree kit, with `FeatureStyle`'s metadata binding and the tile formats             | `streaming/Tileset3D.ts`, `Tile.ts`, `tileset*.ts`, `io/composite.ts`, `scene/FeatureStyle.ts` | CS-554                     |
| `@cesium/loader-gltf`            | glTF's parser, as a decoder job type, and a `whole` source kind for one glTF file                                        | `io/gltfParse.ts`, `gltfTypes.ts`, `gltfLights.ts`, `glb.ts`                                   | CS-552's job types, CS-556 |
| `@cesium/loader-draco`           | Draco mesh decoding, as a job type                                                                                       | `io/decoders.ts` (1.x's build)                                                                 | CS-811                     |
| `@cesium/loader-basis`           | KTX2 and Basis Universal transcoding, as a job type                                                                      | `io/decoders.ts` (imported from 1.x's tree)                                                    | CS-811                     |
| `@cesium/imagery-url-template`   | An imagery provider from a URL template                                                                                  | `globe/ImageryProvider.ts`                                                                     | CS-810                     |
| `@cesium/imagery-bing`           | Bing Maps imagery, with per-tile credits                                                                                 | `BingImagery` in `globe/ImageryProvider.ts`                                                    | CS-810                     |
| `@cesium/imagery-quantized-mesh` | A terrain provider for quantized mesh                                                                                    | `globe/quantizedMesh.ts`, the decode side of `globe/TerrainSource.ts`                          | CS-810, CS-555             |
| `@cesium/data-node`              | A data-resource provider over the file system, for Node                                                                  | `engineering/projNode.ts`, `FRAMES_DATA_DIR` reads                                             | CS-808                     |

**Planned.** Each is created by the item that builds it, in its final home.

| Package                                                             | Implements                                                                                                 | Item                 |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------- |
| `@cesium/imagery-wmts`, `@cesium/imagery-ogc`                       | WMTS; WMS, OGC API Maps and OGC API Coverages                                                              | CS-279, after CS-810 |
| `@cesium/source-mvt`                                                | Vector tiles, as features                                                                                  | CS-557               |
| `@cesium/esri`                                                      | A service bundle: map and tile services, feature services (and their edits), elevation with a LERC decoder | CS-558               |
| `@cesium/source-i3s`                                                | I3S scene layers, a `tree` source on the kit                                                               | CS-558               |
| `@cesium/loader-usd`                                                | USD stages, a `whole` source with payloads by view                                                         | CS-559               |
| `@cesium/loader-czml`, `loader-kml`, `loader-geojson`, `loader-gpx` | 1.x's formats, as `whole` sources                                                                          | CS-668               |
| `@cesium/source-*` for PostGIS                                      | Features by view through a server the application names, named for the protocol it speaks                  | CS-663               |
| `@cesium/data-indexeddb`                                            | An offline data-resource provider                                                                          | After CS-808         |
| `@cesium/geocoder-*`                                                | One per geocoding service the widgets library ships; ion's geocoder lives in `@cesium/ion`                 | CS-584               |
| `@cesium/tiling-native`                                             | Cesium Native in WebAssembly, one source kind that brings its own tree, selection and cache                | CS-806               |
| Catalog adapters (STAC, CSW, OGC API Records)                       | The catalog seam; prefix to decide (decision 3)                                                            | CS-818               |

**What tells `source-*` from `loader-*`.** A `source-*` package decides what to load as views move: a tree, a tiled service, a feed. A `loader-*` package turns the bytes of one format into plain data (`MeshData`, feature rows, images), as job types on the worker pool, and may also register a `whole` source kind that opens one file of its format. So 3D Tiles is a source that uses `loader-gltf` for its content, and a glTF file opened alone goes through `loader-gltf`'s own kind.

### The umbrella

`cesium` depends on the standard set: the six capability packages, `crs-proj`, `ion`, `source-3d-tiles`, `loader-gltf`, `loader-draco`, `loader-basis` and the three `imagery-*` packages above. It has the same entry points as today's package, renamed where the map renames them:

| Today                  | The umbrella     | Re-exports                      |
| ---------------------- | ---------------- | ------------------------------- |
| `@cesium/next`         | `cesium`         | `@cesium/core` and the adapters |
| `@cesium/next/time`    | `cesium/time`    | `@cesium/time`                  |
| `@cesium/next/frames`  | `cesium/frames`  | `@cesium/frames`                |
| `@cesium/next/proj`    | `cesium/crs`     | `@cesium/crs` and `crs-proj`    |
| `@cesium/next/measure` | `cesium/measure` | `@cesium/measure`               |
| `@cesium/next/widgets` | `cesium/ui`      | `@cesium/ui`                    |

So an application that imports from the umbrella sees today's names, and the bundle check's globe-only page stays what it is. What the umbrella wires, once the seams exist: the `url` and `ion` resolvers, the 3D Tiles and glTF kinds, the decoders, PROJ as the coordinate service, and the Viewer's defaults (Cesium World Terrain and ion's imagery). Today those defaults sit in `Engine` and the Viewer, so they move only as their seams land.

## Every seam

Each seam is owned by the capability package that consumes it. "Today" is what exists on main or on a branch waiting to merge; "Planned" names the package each new adapter lands in.

### Owned by `@cesium/core`

| Seam                          | Interface                                                                                             | Today                                                                 | Planned                                                                                                                                                                                 | Item                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Fetch and credentials         | `FetchProvider`, `Credential`, `RequestProxy`, `OriginRule`                                           | On CS-809's branch: one provider in core, over the platform's `fetch` | ion's renewable token (`ion`); a host's own; `connect` for streams (CS-552's decision 4)                                                                                                | CS-809                   |
| Data resources                | `read(name, { signal, onProgress })`                                                                  | Fixed base URLs (`loadProj`, `gridSource`, `loadFrameData`)           | HTTP in core; `data-node`, `data-indexeddb`, ion's (`ion`); a host's own; writable, for CS-831's files                                                                                  | CS-808                   |
| Asset resolution              | `AssetResolver`, `ResolvedAsset`                                                                      | `resolveIonAsset`, `resolveITwinIModel`                               | `url` in core; `ion`; `itwin`; a host's own; a catalog's items                                                                                                                          | CS-552, CS-269           |
| Content sources               | `SourceKind`, `ContentSource`, `SourceHost`, the sinks, the budget                                    | `Tileset3D` and `Globe`, inside core                                  | `source-3d-tiles`, the globe's terrain and imagery kinds (core), `loader-gltf`, `source-mvt`, `esri`, `source-i3s`, `loader-usd`, `tiling-native`, the 1.x formats, PostGIS, live feeds | CS-552, CS-554 to CS-559 |
| The tile-tree kit             | `BudgetedSelection`, `Stepwise`, eviction, transitions, occlusion                                     | Inside streaming                                                      | Shared by `source-3d-tiles`, the terrain kinds, `source-i3s`, `source-mvt`; not by `tiling-native`                                                                                      | CS-552                   |
| Decoders                      | A job type a module registers by URL (`ModuleRef`)                                                    | `io/worker.ts`'s fixed message types                                  | `loader-gltf`, `loader-draco`, `loader-basis`, LERC (`esri`)                                                                                                                            | CS-552, CS-811           |
| Imagery and terrain providers | `ImageryProvider` (`fetchTile`, tile matrix sets, box requests, per-tile credits); a terrain provider | `ImageryProvider` with three implementations; `TerrainSource`         | `imagery-url-template`, `imagery-bing`, `imagery-quantized-mesh`, ion's TMS (`ion`), `imagery-wmts`, `imagery-ogc`, `esri`                                                              | CS-810, CS-279           |
| Render features               | `RenderFeature`, passes in named slots                                                                | None; post stages and `addFrameCompute` only                          | First-party only at first, inside core: imagery compositing, Gaussian splats, points (CS-552's decision 1)                                                                              | CS-552                   |
| Post stages                   | `createPostStage`, `GraphStage`                                                                       | In core                                                               | An application's own                                                                                                                                                                    | Built                    |
| Render device                 | `RenderDevice` (`scene/renderSeam.ts`)                                                                | WebGPU, in core                                                       | WebGL 2 as a tier of core, loaded by the engine's device choice                                                                                                                         | CS-35                    |
| Render products               | Named outputs: `color`, `depth`, `normal`, `motion`, `instanceId`, `semanticId`                       | Color only (`OffscreenTarget.read()`)                                 | A contract, not an adapter seam                                                                                                                                                         | CS-813                   |
| Camera records                | `CameraRecord`, `CameraIntrinsics`, `CameraDistortion`                                                | On CS-814's branch                                                    | A contract; distortion models beyond `none` come later as post stages                                                                                                                   | CS-814                   |
| Identity and labels           | Stable IDs, labels by taxonomy                                                                        | A running counter (`nextFeatureId`)                                   | A contract every source keeps; IDs come from content or from the host                                                                                                                   | CS-815, CS-832           |
| Stepping                      | Advance to a time, wait until settled, render, read back                                              | `renderFrame()`, `whenReady()`                                        | A contract on `Engine`, with `time`'s clock in stepped mode                                                                                                                             | CS-816                   |
| Editing                       | `WriteCapabilities`, `SourceWriter`, `ChangeSet`, the edit layer                                      | None                                                                  | Writers in each source adapter that can write: `esri` (`applyEdits`), PostGIS's server, `itwin` (changesets), `loader-usd` (layers), writable `data-*`                                  | CS-831                   |
| Catalogs                      | A query in, asset references out                                                                      | None                                                                  | STAC (Planetary Computer included), CSW, OGC API Records; ion's asset list in `ion`                                                                                                     | CS-818                   |
| Frame resolver                | `FrameResolver`                                                                                       | `tableResolver` (core); `createFramesResolver` (`frames`)             | An application's own                                                                                                                                                                    | Built                    |
| Spatial queries               | `QueryHost`, `RayBackend`                                                                             | CPU structures and compute traversal, in core                         | A source's own answers through `ContentSource.queries`                                                                                                                                  | CS-552                   |
| Controllers                   | `GlobeController`, `InspectController`, `OrbitController`                                             | In core                                                               | An application's own                                                                                                                                                                    | Built                    |
| Curvilinear transforms        | Transform-graph nodes, `fromFunction`                                                                 | Built-ins in Slang with a TypeScript mirror                           | An application's own, as restricted JavaScript                                                                                                                                          | Built                    |

### Owned by the other capability packages

| Owner            | Seam                  | Interface                                                           | Today                                         | Planned                                                | Item             |
| ---------------- | --------------------- | ------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------ | ---------------- |
| `@cesium/time`   | Time zones            | `ZoneLookup`                                                        | Supplied by the application                   | No first-party adapter planned                         | Built            |
| `@cesium/frames` | Coordinate service    | `CoordinateService`                                                 | `projCoordinateService`, in `/proj`           | `crs-proj`; a host's own service                       | Built            |
| `@cesium/frames` | Frames data           | Earth orientation, ephemeris and EOP data                           | Loaded lazily from fixed URLs                 | Through the data-resource provider                     | CS-808           |
| `@cesium/crs`    | Coordinate operations | New: what `crs.ts`, `factors.ts` and `EngineeringFrame` ask of PROJ | `ProjApi` itself, about 100 calls to `proj_*` | `crs-proj`                                             | Follow-up item 1 |
| `@cesium/crs`    | Snapping              | `SnapService`                                                       | `ClientSnapService` over retained geometry    | A host's server snap                                   | Built            |
| `@cesium/crs`    | Grids                 | `GridSource`                                                        | `gridSource({ base })`                        | Through the data-resource provider                     | CS-808           |
| `@cesium/ui`     | Geocoding             | A geocoder service                                                  | None                                          | `geocoder-*`, ion's in `ion`                           | CS-584           |
| `@cesium/ui`     | Credits shown         | `CreditSource`                                                      | In `widgets/credits.ts`                       | Reads core's credits, which ride with content (CS-552) | Built            |

`@cesium/measure` owns no seam: it measures through `frames`, `crs` and core's queries.

## What stays internal to core, and why

The item asks whether `ir`, `gpu`, `render`, the streaming host and `query` stay in core. They do, each for its own reason:

- **`ir` (Cesium IR).** The transform graph compiles through it (the transform core imports it for values in 10 places), and so do styling and shaders. It has no consumer outside core. Its JSON format has its own version line, `cesium-ir/0.x`, experimental until it graduates (CS-837); a file format doesn't need a package. If tools outside the engine ever read or write IR files on their own (the B-rep tiler, say), `@cesium/ir` on a 0.x line is the way out.
- **`gpu` and `render`.** The engine, worlds and views reach the renderer only through `RenderDevice` and the named `SEAM_EDGES`, so a split is possible. But it would buy nothing yet: there's one renderer, and core with no renderer isn't useful to anyone. When WebGL 2 exists (CS-35), it stays a tier of core loaded by the device choice, so an application never wires its renderer by hand. A `renderer-*` package is a later call, if a measure shows the WebGPU renderer costs an application that doesn't use it.
- **The streaming host.** `TilesetHost`, `DrawSink`, the request scheduler and the budget's arbiter are the host half of the content-source seam. Every source depends on them, so they belong to the seam's owner.
- **`query`.** Picks, rays, heights and clamping run over what the engine holds, for every source (CS-552). They are core by design.
- **The tile-tree kit** stays in core too, though only adapters use it: it is the tuned machinery every `tree` source shares, and putting it in an adapter would make other adapters depend on 3D Tiles. Its members carry `@experimental` until three sources use it.
- **The globe's composition** (the globe as content made of a terrain source and ordered imagery layers, the imagery compositor and the terrain kind's tree) stays in core. The providers under it are adapters. The globe is what clamping, heights, the camera's collision and the body's occluder read, so the seam that every terrain and imagery provider implements has to be core's.

## The directory layout

One folder per package, under `packages/next/packages/`. The umbrella stays at `packages/next` itself, with the tools that test the whole engine beside it.

```text
packages/next/                  the umbrella (development name @cesium/next) and 2.0's workspace
  package.json                  the umbrella: its dependencies and entry points
  src/                          the umbrella's entries only: index.ts, time.ts, frames.ts, crs.ts, measure.ts, ui.ts
  test/  bench/  handbook/  lab/  examples/  demo/  parity/  spikes/  standalone/  scripts/  tools/
  packages/
    core/                       package.json, src/ (today's folders keep their names: src/scene, src/gpu, …)
    time/  frames/  crs/  measure/  ui/
    crs-proj/  ion/  itwin/
    source-3d-tiles/  loader-gltf/  loader-draco/  loader-basis/
    imagery-url-template/  imagery-bing/  imagery-quantized-mesh/
    data-node/
```

- **Folder names are package names without the scope,** so `@cesium/source-3d-tiles` lives in `packages/next/packages/source-3d-tiles`.
- **Inside a package, today's folder names stay,** so core's tier rules (`gpu`, `renderer`, `scene`, `content`, `webgl2`) keep their path patterns, rooted at `packages/core/src/`.
- **Why nested, not beside 1.x.** The repository root's `packages/` already holds 1.x's `core`, `engine`, `gltf`, `widgets` and `sandcastle`, so a 2.0 `packages/core` would collide. When CS-609's clean 2.0 branch lifts `packages/next` to the root, `packages/next/packages/<name>` becomes `packages/<name>` with nothing else changing. The root's workspaces gain `packages/next/packages/*`, as they already list `packages/next/tools/dyno`.
- **Each package's `package.json`** has its name, `"type": "module"`, accurate `sideEffects`, `exports` pointing at its `src/index.ts` (as today's entry points do), and its sibling dependencies at the exact shared version. React stays a peer dependency of `@cesium/ui` only.
- **Tests stay in `packages/next/test`,** one suite, as today. They import packages by name. Splitting tests per package is not part of the move.

### The rule that replaces `layerOf`

`layerOf` assigns a layer to each file by path pattern. After the move, the layer is the package, and each package's `package.json` dependencies are the rule. The import-boundary test reads them:

1. **Imports leave a package only by name.** A relative import never reaches outside its package's folder, and a package imports a sibling only if its `dependencies` list that sibling.
2. **The dependencies form no cycle.**
3. **No capability package depends on an adapter or on the umbrella,** type-only imports included, because published declarations carry them. The six capability names are a list in the test, so adding a seventh is a deliberate change.
4. **The capability order holds:** `core` depends on no sibling, and each of `time`, `frames`, `crs` and `measure` only on those before it.
5. **No adapter depends on the umbrella,** and only the umbrella re-exports another package's names. Today's re-exports of shared utilities (`measure`'s `C`) stay as named exceptions.
6. **Siblings' imports from `@cesium/core/internal`** (decision 1) are an allowlist of names, as `FRAMES_CORE_VALUES` is a list of files today. The bundle check gains a time-only and a frames-only page, so a stale `sideEffects` can't pull the renderer into either.

What the test keeps: everything about core's inner tiers (`tierOf`, `TIER_EXCEPTIONS`, `SEAM_EDGES`, the content, renderer, GPU and `webgl2` rules), the transform rules and the bundle check. Those are rules inside one package and stay path patterns.

## Names for CS-616

**Published at alpha.1, in lockstep at `cesium`'s version:**

- `cesium`, the umbrella;
- `@cesium/core`, `@cesium/time`, `@cesium/frames`, `@cesium/crs`, `@cesium/measure`, `@cesium/ui`;
- `@cesium/crs-proj`, `@cesium/ion`, `@cesium/itwin`;
- `@cesium/source-3d-tiles`, `@cesium/loader-gltf`, `@cesium/loader-draco`, `@cesium/loader-basis`;
- `@cesium/imagery-url-template`, `@cesium/imagery-bing`, `@cesium/imagery-quantized-mesh`;
- `@cesium/data-node`.

Those of them whose seams aren't built by alpha.1 publish then from core's code, re-exported, or wait for their seam; the alpha.1 plan (CS-617) says which.

**Later, each with its item, on a 0.x line until it passes review:** `@cesium/imagery-wmts`, `@cesium/imagery-ogc`, `@cesium/source-mvt`, `@cesium/source-i3s`, `@cesium/esri`, `@cesium/loader-usd`, `@cesium/loader-czml`, `@cesium/loader-kml`, `@cesium/loader-geojson`, `@cesium/loader-gpx`, a `source-*` for PostGIS's protocol, `@cesium/data-indexeddb`, the `@cesium/geocoder-*` packages, `@cesium/tiling-native` and the catalog adapters.

**Names 2.0 doesn't use:**

- `@cesium/engine` and `@cesium/widgets` stay 1.x's: both are already past 2.0.0.
- `@cesium/gltf` stays 1.x's. 2.0's glTF is `@cesium/loader-gltf`, so nothing has to give way.
- `@cesium/sandcastle` stays 1.x's until CS-628 decides 2.0's gallery.
- `@cesium/dyno` is a private workspace package and is never published.

**How 1.x's `@cesium/core` gives way** is decision 2. `cesium` itself already follows the release plan's rule: 2.0 takes the name over as a new major.

**One constraint on publishing `cesium`.** The repository root's `package.json` is named `cesium` (1.x, 1.147.0), so the umbrella can't take that name in this repository. It keeps `@cesium/next` as its development name and publishes as `cesium` from CS-609's clean 2.0 branch, where the root is 2.0's.

**Every name is checked on the registry before alpha.1,** as CS-616 did for the first ones on 2026-11-17. This note didn't check them.

## CS-835: the move

Pure moves: files change folders, and import specifiers change to follow them. Nothing else. A type check per commit (`npx tsc --noEmit -p .` and `-p tsconfig.lib.json`); then, once at the end, the full `npm test`, `npm run test:data`, the parity suites against the previous commit and a base, `shaders:check`, the bundle check and `npm run surface`. A failure at the end is found by bisecting the commits.

### The order of commits

Bottom up, so that every package exists before anything imports it by name.

1. **Scaffolding.** The root's workspaces gain `packages/next/packages/*`; the six capability folders get a `package.json` and an empty `src/index.ts`; `tsconfig*.json`, the Vitest config and the Vite configs include them; one `npm install` writes the lockfile with the workspace links. No external dependency is added.
2. **`@cesium/core`.** Every folder whose files `layerOf` calls core or utilities moves to `packages/core/src/`, keeping its name. Core's entry point is today's `src/index.ts`, moved. A new `src/internal.ts` re-exports, with `@internal`, the names siblings import that aren't public (decision 1). `scripts/slangBuild.mjs`, `checkBundle.mjs`, `surfaceMap.mjs` and `handbookData.mjs` follow the paths. The rest of `src/` imports core by name.
3. **`@cesium/time`.** The `TIME_FILES` move. `frames` and the widgets import `@cesium/time`.
4. **`@cesium/frames`.** `frames`, `ephemeris`, `trajectory` and the rest of `time` move.
5. **`@cesium/crs`.** `engineering` and `proj` move, PROJ included (see below).
6. **`@cesium/measure`.**
7. **`@cesium/ui`.** `widgets/` moves, and its imports of `@cesium/next/*` become `@cesium/core`, `@cesium/time` and `@cesium/frames`.
8. **The umbrella.** `packages/next/src/` keeps only the six entry files, each re-exporting its package. `package.json`'s exports become `.`, `./time`, `./frames`, `./crs`, `./measure` and `./ui`, and its dependencies the six packages. The workspace's own name stays `@cesium/next`.
9. **The import-boundary test** reads the rule from the packages' `package.json` files, as above, and fails if a capability package depends on an adapter. Its own tests plant a bad edge of each kind.
10. **The handbook and the docs** follow: the architecture tab's stack and the API tab's entry names, read from the new layout.

`api/surface.txt` changes only where the map renames an entry point: `proj` becomes `crs`, and `widgets` becomes `ui`. Each package's own surface is CS-617's, not the move's.

### What can't be a pure move

These stay where they are in CS-835, inside the package that holds them today, and move with the item that builds their seam. Each needs code, not only a move.

| What                                           | Why it can't move now                                                                                                                                                                                                                                                             | Moves with                       |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| PROJ, out of `@cesium/crs` into `crs-proj`     | `crs.ts`, `factors.ts`, `EngineeringFrame.ts` and `georeferenceTileset.ts` call PROJ's C API through `ProjApi` directly (about 100 `proj_*` calls; `EngineeringFrame.ts` only names its types). `crs` needs a coordinate-operations seam first, or it would depend on its adapter | Follow-up item 1                 |
| ion and iTwin, out of core                     | `ImageryProvider.ts`, `Tileset3D.ts` and `tilesetTypes.ts` import `io/ion.ts`; the Viewer takes ion's token and builds Earth's globe from ion's defaults                                                                                                                          | CS-269, CS-810                   |
| 3D Tiles, out of core                          | `Engine.loadTileset` and `addTileset`, `World.add` taking a `Tileset3D`, and `crs`'s snapping, design picks and georeference reading `Tileset3D`, `Tile`, `tilesetBody.ts` and `volumes.ts`                                                                                       | CS-554                           |
| The imagery and terrain providers, out of core | `Globe extends Tileset3D`, and the providers' contract isn't fixed                                                                                                                                                                                                                | CS-810, CS-555                   |
| glTF, out of core                              | The content worker knows glTF as a fixed message type; a module can't register a decoder yet                                                                                                                                                                                      | CS-552's job types, CS-556       |
| Draco and Basis, out of core                   | `io/decoders.ts` imports Basis from 1.x's tree                                                                                                                                                                                                                                    | CS-811                           |
| The Node file provider                         | The data-resource provider doesn't exist yet                                                                                                                                                                                                                                      | CS-808                           |
| The Viewer's defaults, into the umbrella       | `@cesium/ui` may not depend on `ion`. Once ion is a package, `@cesium/ui`'s Viewer takes its globe and services as options, and the umbrella's Viewer passes ion's                                                                                                                | After CS-269, reviewed in CS-102 |

**One call for CS-554's executor.** `crs`'s snapping and design picks should reach retained geometry through core's queries, and the code that reads a tileset's georeference extensions should move into `source-3d-tiles` as the 3D Tiles binding of `crs`'s declared-placement contract. Otherwise `crs` would depend on an adapter once 3D Tiles leaves core.

**What CS-835 needs from this map that isn't settled:** decision 1 only. With option A, step 2 adds `internal.ts`; with option B, step 1 adds a seventh folder. Either way, the other steps don't change.

## CS-977: what moved and what waits

**Checked 2026-11-22, on `hitld/CS-977-adapters-leave-core`.** The owner held alpha.1 until the adapters leave `@cesium/core`'s entry (CS-974, answer C). A package publishes at alpha.1 only once its seam has landed, and its name may change until beta.1's API review (CS-973, answer C). None of the seams below has landed yet, and CS-847, the content-source seam's core they build on, is held for a design review. So CS-977's first round took engine internals off core's entry and left the adapters where they are. It lands none of CS-617's packages: it made no new package.

### What left the entry

Each name below had no use for a host. Every user outside core moved, and `api/surface.txt` shows the result.

| Name                                                                                                                                  | What it is                                                          | Where it went                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `SlicePool`                                                                                                                           | The globe's imagery slice pool                                      | `@cesium/core/internal`, for `@cesium/ui`'s inspector (`SlicePool.usage`)   |
| `BASE_BINDING_LIMITS`, `BASE_CAPACITY_LIMITS`                                                                                         | The GPU layer's limit tables                                        | Off the entry; `gpu/limits.ts` inside core                                  |
| `assembleMeshCaps`, `meshPlane`, `rayHitRegions`, `sectionTile`, `tileBounds`, `triangulateRegion`, `MeshCapGeometry`, `MeshCapPlane` | `MeshCaps`' inner steps                                             | Off the entry; `scene/world/meshCaps.ts` inside core                        |
| `SectionJob`, `runSection`                                                                                                            | What `BrepCaps` and the section worker run                          | Off the entry; `brep/section.ts` and `brep/sectionHost.ts` inside core      |
| `castTerrainRay`, `TerrainRayOptions`, `TerrainRayResult`                                                                             | The terrain ray trace the ray seam keeps behind the query interface | Off the entry; rays go through `Engine.queries` or `terrainQueries`         |
| `LEVEL_ZERO_ERROR`                                                                                                                    | A terrain tree's constant                                           | Off the entry; `globe/TerrainSource.ts` inside core                         |
| `resolveUri`                                                                                                                          | The tileset reader's URL join                                       | Off the entry; `io/resolveUri.ts` inside core, with 3D Tiles later (CS-554) |

**What stayed, though it looks internal.** Public signatures name these, so taking them off would leave a type a host can't name: `SliceUser` (`GlobeImagery` implements it), `LimitsTier` (`GpuDevice`'s options), `ElementCap` (`MeshCapReport`), `SectionRunner` (`BrepCaps`' options), and `TerrainRayPatch`, `TerrainRayTarget` and `TerrainRayTile` (the globe, `Tileset3D` and `terrainQueries`). `ModelPool` stays too: the release plan names it as one of the APIs that replace 1.x's `Primitive` (`docs/decisions/2026-11-17-release-plan-and-parity.md`). `GpuDevice` and `Capabilities` wait for the API review's answer on the GPU layer (the Fable review's Q3).

### What waits for its seam

Each adapter keeps its names in core's entry until the item in the last column lands. Then the move is: the files go to the package's folder, `packages/<name>/src/`; the package's `src/index.ts` exports the names; core's entry drops them; and the umbrella's `packages/cesium/src/index.ts` adds `export * from "@cesium/<name>"`, so an application that imports `cesium` keeps its import paths. Any name may still change until beta.1's API review (CS-973 C).

| Package (target)                       | Names in core's entry today                                                                                                                                                                                                                       | Files                                                                                                                                     | Waits for                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `@cesium/ion`                          | `ionDefaults`, `resolveIonAsset`, `IonAsset`, `IonOptions`, `IonTmsImagery`, `loadIonMoonMap`, `MoonMap`, `CESIUM_MOON_TERRAIN`; `BingImagery.fromIon`                                                                                            | `io/ion.ts`, `io/moonMap.ts`, `io/moonMapLoad.ts`, `io/moonMapWorker.ts`, ion's half of `globe/ImageryProvider.ts`                        | CS-269 (asset resolver), CS-810 (providers)               |
| `@cesium/itwin`                        | `resolveITwinIModel`, `ITwinOptions`                                                                                                                                                                                                              | `io/itwin.ts`                                                                                                                             | CS-269's resolver interface                               |
| `@cesium/source-3d-tiles`              | `Tileset3D`, `Tile`, `TileGeometry`, `tileHeaderKey`, `TilesetOptions`, `TilesetStats`, `TilesetEvents`, `PurposeStats`, `TilesetBodyError`, `collectFullDetailContents`, `TileContent`, `FeatureStyle`, `FeatureStyleOptions`, `StyleExpression` | `streaming/Tileset3D.ts`, `Tile.ts`, `tileset*.ts`, `tiles/fullDetail.ts`, `io/composite.ts`, `io/resolveUri.ts`, `scene/FeatureStyle.ts` | CS-554, on CS-847; `Globe extends Tileset3D` until CS-555 |
| `@cesium/loader-gltf`                  | `GltfAsset`, `FeatureTable`                                                                                                                                                                                                                       | `io/gltfParse.ts`, `io/gltfTypes.ts`, `io/gltfLights.ts`, `io/glb.ts`                                                                     | CS-556, on CS-847's job types                             |
| `@cesium/imagery-url-template`         | `UrlTemplateImagery`                                                                                                                                                                                                                              | Its class in `globe/ImageryProvider.ts`                                                                                                   | CS-810                                                    |
| `@cesium/imagery-bing`                 | `BingImagery`                                                                                                                                                                                                                                     | Its class in `globe/ImageryProvider.ts`                                                                                                   | CS-810                                                    |
| `@cesium/imagery-quantized-mesh`       | None in the entry                                                                                                                                                                                                                                 | `globe/quantizedMesh.ts`, the decode side of `globe/TerrainSource.ts`                                                                     | CS-810, CS-555                                            |
| `@cesium/loader-draco`, `loader-basis` | None in the entry                                                                                                                                                                                                                                 | `io/decoders.ts`                                                                                                                          | CS-811                                                    |
| `@cesium/data-node`                    | None in core's entry                                                                                                                                                                                                                              | `projNode.ts` in `@cesium/crs`                                                                                                            | CS-808                                                    |

Three names stay in core when their neighbors move: `ImageryProvider` (the providers' seam), `Attribution` (credits ride with content, CS-552) and `FeatureValue` (picks return it for every source). PROJ's names in `@cesium/crs` aren't core's; they move to `@cesium/crs-proj` with CS-882.

**What alpha.1 can publish, under CS-973 C,** is the six capability packages and the umbrella, with these adapters' names still in core's entry. None of the adapter packages above publishes at alpha.1 unless its seam lands first. CS-974 C holds alpha.1 until they leave, so either the seams land before alpha.1, or the owner revisits CS-974 for the names that wait.

## Decisions for the owner

Each goes back to the main session to file, with options and a recommendation.

1. **Where the shared utilities and neutral contracts live.** `time`, `frames`, `crs` and `measure` import 35 core files today, 21 for values: math, `Emitter`, `SceneClock`, bulk work, `Body`, routes, the frame resolver and the transform graph's nodes. A package can import only what another publishes.
   - A. Core is the base. Most of these names are already public in core. The rest are exported from one `@cesium/core/internal` subpath, marked `@internal`, outside the stable API, for lockstep siblings only. _Recommended:_ no new name, core's name fits the role, and the capability order stays today's.
   - B. A seventh package, such as `@cesium/base`, for math, the utilities and the neutral contracts, which every other package depends on. Cleaner for an application that wants only `time` or `frames` on Node, at the cost of a public name and a split of `Body` and the resolver's contract out of core.
   - C. Copy the utilities into each package at build time. Cheapest, but two copies of `Emitter` break `instanceof`, and it hides the dependency.
2. **How 1.x's `@cesium/core` (0.1.1) gives way,** for CS-616. 1.x's `@cesium/engine` depends on it at `^0.1.1`, and it is the 1.x team's current work.
   - A. One name, two version lines. 1.x keeps publishing 0.x, under a `1x` dist-tag once 2.0.0 is out; 2.0 publishes 2.0.0 prereleases under `next` and takes `latest` at 2.0.0, as `cesium` does. `^0.1.1` never resolves to 2.x, so 1.x installs are unaffected. Needs the 1.x team's agreement, and both READMEs say which line is which. _Recommended:_ it follows the release plan's rule for `cesium`, and costs 1.x nothing.
   - B. 1.x renames its package before alpha.1 and deprecates `@cesium/core` 0.x with a pointer to the new name.
   - C. 2.0 takes a fresh name for its core, and the map's `@cesium/core` changes everywhere.
3. **A prefix for catalog adapters (CS-818),** which the owner's list doesn't name.
   - A. `catalog-*` (`catalog-stac`, `catalog-ogc`). _Recommended,_ decided when CS-818 is committed. Nothing waits on it now.
   - B. Under `source-*`. But a catalog isn't a content source: it returns references that sources then open.

**For the API review (CS-102),** not decisions now: the umbrella's entry renames (`/proj` to `/crs`, `/widgets` to `/ui`); what goes in `@cesium/core/internal`; the Viewer's split between `@cesium/ui` and the umbrella; `@cesium/esri` as a service bundle beside `@cesium/source-i3s`; `imagery-url-template` as the name of 1.x's URL template provider; and the tile-tree kit's members as `@experimental`. This map also answers CS-552's decision 5 (entry points per family of sources): each family is a package, named here.

## Follow-up items for the main session

1. **"PROJ behind a coordinate-operations seam: `@cesium/crs-proj` splits from `@cesium/crs`."** Kind work, project CS-615, needs CS-835 and CS-808. Done when: `crs` declares the operations it asks of PROJ (CRS definitions, operation lists and resolution, transforms, grid factors, grids used) as an interface; `crs.ts`, `factors.ts`, `EngineeringFrame.ts` and `georeferenceTileset.ts` use only it; `proj*.ts`, `gridCatalog.ts` and PROJ's WebAssembly move to `crs-proj`, which implements it and `frames`' `CoordinateService`; the boundary test shows `crs` with no dependency on `crs-proj`; the umbrella's `cesium/crs` surface is unchanged.
2. **For CS-617, not a new item:** each package's own surface in `api/surface.txt` (`scripts/surfaceMap.mjs` reading every package's exports), and each package's `files`, `sideEffects` and README for publishing.

## Risks

- **`sideEffects` decides what a package costs.** With core at the base, a time-only application pulls `@cesium/core/internal`, and only an accurate `sideEffects` lets a bundler drop the renderer. The bundle check's time-only and frames-only pages guard it.
- **Workspace links change resolution.** Today the widgets import the package's own name; after the move every package resolves its siblings through `node_modules` links. A missing link fails loudly at the type check, which is what each commit's check is for. Vite, Vitest and `tsc` all resolve `exports` that point at `.ts` files today, so no build step is added.
- **The move touches nearly every file's imports.** It runs alone, with new starts paused (CS-835's done-when), and bisects on failure rather than testing each commit.
