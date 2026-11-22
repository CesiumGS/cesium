# The content-source seam: plan

**Status (2026-11-21):** written for CS-552, for the owner to review. Nothing is built. It turns CS-554 to CS-559 into planned items and proposes three new ones. The main session makes the item changes; the executor can't.

**Goal:** every kind of content source loads through `ContentSource`, one interface in core, with each source a module an application imports only if it uses it.

**Design:** [content-source-seam.md](../../design/content-source-seam.md). Read its "The interface in one page" and "Decisions for the owner" before this.

**Sources:**

- The owner's calls: [content sources as modules](../../decisions/2026-11-16-content-sources-as-modules.md) (CS-551) and [the release plan](../../decisions/2026-11-17-release-plan-and-parity.md), which puts the content-source seam in alpha.1.
- The seams it sits on: CS-809 (fetch and credentials), CS-808 (data resources), CS-810 (imagery and terrain providers), CS-815 (stable identity), CS-816 (stepping), CS-831 (the editing design) and CS-33 (the renderer seam, done).
- Its baseline: CS-553 (what 3D Tiles costs an application that doesn't use them).
- The code read: main at `f112dc0903`.

## 1. Decisions this plan waits on

The design raises six decisions. Each row below says which one it needs. Until a decision is answered, an item that needs it does only the parts that don't depend on it.

| Decision                          | Recommended                                                                      | Needed by                      |
| --------------------------------- | -------------------------------------------------------------------------------- | ------------------------------ |
| D1. Do renderer passes register?  | A: inside the engine first, outside modules after the API review                 | New item B, CS-555             |
| D2. The globe as an item (CS-454) | A: content composed of a terrain source and imagery layers, per body             | CS-554 (its last step), CS-555 |
| D3. A USD runtime                 | A: a spike first, OpenUSD in WebAssembly against a TypeScript subset             | CS-559                         |
| D4. Push transport                | A: `connect` for streams on CS-809's provider, after it merges                   | New item C                     |
| D5. Entry points and their names  | One entry per family, named with the packages                                    | CS-554 to CS-559               |
| D6. Ion's interface (CS-269)      | A: an `AssetResolver` and a credential provider; ion is a resolver, not a source | A, CS-269                      |

## 2. Order

- **First:** item A, the seam's core, once CS-809, CS-815 and CS-831's design are done.
- **On A, in parallel:** CS-554 (3D Tiles and the kit), CS-556 (glTF files), item B (render features, once D1 is answered) and item C (streams, once D4 is answered).
- **On CS-554:** CS-555 (the globe), which also needs CS-810 and item B, and CS-557 (MVT), which also needs CS-261's vector drawing.
- **Last:** CS-558 (Esri), on CS-555 and CS-557, and CS-559 (USD), on CS-556 and D3.

CS-556 can run beside CS-554: they share the glTF parser, which stays where it is (`src/io/gltfParse.ts`), and neither moves it. CS-554 and CS-555 touch the same files (`Tileset3D.ts`, `Globe.ts`), so they run one after the other.

## 3. Milestones

Per the cost rules: Sonnet by default, Opus for item A, CS-554 and CS-555 (the seam, the kit's extraction and the globe's split are the design and the risk). Each runs typecheck, eslint and prettier on its files, its own tests on the fake device (`test/fakeGpu.ts`), and `npm run surface` when it changes an entry point. The full suite runs once at the end of each item. Measurements and parity runs go through Dyno, on the executor's own server, never the owner's 5190 or 5199. No durations: order and dependencies only.

| #       | Milestone                                                                                                                                                                 | Files                                                                                                                                                                                                                                                                      | Done when | Needs                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------------------------------- |
| A (new) | **The seam's core.** The interface's types, the kind registry, `SourceHost`, the budget arbiter, the sinks, push, and CS-831's three alpha.1 pieces. No source moves yet. | new `src/source/` (types, registry, host, arbiter, sinks); `src/io/Jobs.ts`, `WorkerPool.ts`, `worker.ts` (decoders by module URL); `src/scene/World.ts` (`add` takes any content); `test/importBoundary.test.ts`, `test/seams.test.ts`; `src/index.ts`; `api/surface.txt` | See 3.1   | CS-552, CS-809, CS-815, CS-831, D6 |
| B (new) | **Render features, inside the engine.** `RenderFeature`, its slots and its declarations for picks, rays and shadows.                                                      | `src/render/view/viewFrame.ts` (the slots, still one function), new `src/render/features/`; `test/seams.test.ts`                                                                                                                                                           | See 3.2   | A, D1                              |
| C (new) | **Streams for push sources.** `connect` on CS-809's provider, for WebSockets and server-sent events.                                                                      | `src/io/` (CS-809's provider); its seam test                                                                                                                                                                                                                               | See 3.3   | A, CS-809, D4                      |
| CS-554  | **3D Tiles through the seam, and the tile-tree kit.**                                                                                                                     | `src/streaming/**`, `src/scene/Engine.ts`, `src/scene/engineContent.ts`, `src/globe/Globe.ts` (only to stop extending), `src/scene/FeatureStyle.ts`, `package.json`, `vite.lib.config.ts`, `scripts/checkBundle.mjs`, `test/importBoundary.test.ts`                        | See 3.4   | A, CS-553                          |
| CS-555  | **The globe's terrain and imagery through the seam.**                                                                                                                     | `src/globe/**`, `src/query/terrainBackend.ts`, `src/scene/heightCaptures.ts`, `src/scene/HeightClamping.ts`, `src/render/world/contentResources.ts`, `widgets/Viewer.ts`                                                                                                   | See 3.5   | CS-554, CS-810, B, D2              |
| CS-556  | **glTF files through the seam.**                                                                                                                                          | new `src/gltf/` (the kind), `src/scene/Engine.ts` (`loadModel` as shorthand), `src/io/gltfParse.ts` (unchanged API)                                                                                                                                                        | See 3.6   | A                                  |
| CS-557  | **MVT through the seam.**                                                                                                                                                 | new `src/mvt/`; `src/vector/**`                                                                                                                                                                                                                                            | See 3.7   | CS-554, CS-261                     |
| CS-558  | **Esri services through the seam.**                                                                                                                                       | new `src/esri/`                                                                                                                                                                                                                                                            | See 3.8   | CS-555, CS-557                     |
| CS-559  | **USD through the seam.**                                                                                                                                                 | new `src/usd/`, `spikes/`                                                                                                                                                                                                                                                  | See 3.9   | CS-556, D3                         |

### 3.1 A, the seam's core (new)

- `SourceKind`, `ContentSource`, `SourceCapabilities`, `SourceHost`, `SourceTick`, `BudgetClient`, the sinks (`DrawSink` as it is, `RasterSink`, `FeatureSink`, `PointSink`, custom rows), `SourceChange`, `AssetRef`, `AssetResolver` and `ResolvedAsset` exist as the design gives them. They are data-only, and the import-boundary test refuses a GPU type or a `World`, `Engine` or renderer import in them.
- CS-831's three pieces are in: `WriteCapabilities` with `READ_ONLY`, the override contract on the sinks (every row has a stable ID from CS-815), and `ChangeSet`, `SourceWriter` and `CommitResult` as types, shaped by CS-831's design.
- A kind is registered by module reference, and its decoders load by URL into every worker of the pool as Jobs types. A test registers a kind and a decoder from a test module, opens a source, and decodes on a worker.
- `engine.open(ref)` resolves a plain URL through the URL resolver, picks the kind, and returns content. `world.add(content, options)` takes any content, not only a `Tileset3D`.
- The budget arbiter takes wants (class, benefit, cost, origin) from every source and grants per origin and over one byte budget. A test with two sources on one origin shows one source's `now` wants served before the other's `prefetch`, the Mount Rainier case in `docs/design/tile-selection-and-memory.md`.
- `host.changed` wakes the engine, and a change applies in the apply phase. A test source pushes samples and an invalidation and uses no timer. With CS-816's stepped clock (or a fake clock if CS-816 hasn't landed), samples apply at their times, and two runs give the same rows.
- An in-memory sample source, in the tests only, writes to every sink and runs on the fake device with no network.
- A seam test fails on any file under a source module that imports `World`, `Engine`, `src/render/` or `src/gpu/`.
- `npm run surface` is run, and `api/surface.txt` is committed. The handbook's architecture tab says what is built.

### 3.2 B, render features inside the engine (new)

- A `RenderFeature` registers its passes in named slots (`opaque`, `translucent`, `ground`, `overlay`, and the post slots), each declaring what it reads and writes. Pass order still comes from one function, `buildViewFrame`.
- Each feature declares whether it writes IDs, gives a ray adapter and casts shadows. A test fails on a feature that declares none of the three, so no default is silent.
- A sample feature on the fake device draws custom rows in the `translucent` slot, depth-tested against a mesh.
- It's internal: nothing exported from an entry point until D1's later step.
- The seam test checks that a render feature's file is in the renderer tier, and that no source's content half imports it.

### 3.3 C, streams for push sources (new)

- CS-809's provider gains `connect(url, init)` for WebSockets and server-sent events, under the same per-origin header rules, credentials and proxies as `fetch`.
- A token or header value never appears in logs, errors, URLs or test output, as CS-809's test checks for `fetch`.
- A push source in a test receives samples over a local socket fixture, with no polling.

### 3.4 CS-554, 3D Tiles through the seam

Keeps its existing first done-when, and adds the rest:

- `Engine.loadTileset`, `addTileset` and `addTerrain` move out of `Engine` (`src/scene/Engine.ts:1054-1180`), and `Globe` stops extending `Tileset3D`. 3D Tiles and terrain then become sources behind the seam, not the core's structure. (Added 2026-11-21, from the owner's review of 2.0's seams.)
- 3D Tiles is the `3d-tiles` kind, exported by the tiles entry point (named per D5). `loadTileset(engine, url)` stays as its shorthand, and `world.add(tileset)` works as today.
- The tile-tree kit is extracted from `Tileset3D`: `BudgetedSelection`, `Stepwise`, `TouchOrder`, eviction, LOD transitions and geomorphs, curvilinear maps, occlusion and casters. 3D Tiles and the globe both use it, and the globe uses it without `Tileset3D`.
- Its content decodes on `Jobs.submit`, with the want's priority, not plain worker requests.
- Its requests and cache go through the budget arbiter. `cacheBytes` stays as a cap on the tileset's share of the engine's byte budget.
- `FeatureStyle` and the metadata-to-property mapping move into the tiles module. The styling language's compiler stays in core.
- Credits come in with content, and the engine keeps one credit list across sources.
- Core imports nothing from the tiles module, and the import-boundary test enforces it. `scripts/checkBundle.mjs` shows what an application with no tilesets saves, against CS-553's baseline, with both commits named.
- The tiles parity suites (`dyno lab`) give the same results as the previous commit. A Dyno measurement of tile loading shows no regression, with run IDs cited.
- `npm run surface` is run, and `api/surface.txt` is committed.

### 3.5 CS-555, the globe's terrain and imagery through the seam

- Terrain is a `tree` source on the kit (quantized mesh and the ellipsoid), with heights in `queries`. `TileSource`'s terrain members leave the tileset, and the 8 `isGlobe` checks become capability checks (`queries`, receivers).
- Imagery is a `derived` source through CS-810's provider contract. It writes images with footprints to `RasterSink`.
- Compositing is a first-party render feature in the frame graph, replacing `WebGpuImageryCompositor`'s own command encoder. The boundary test's exceptions for `GlobeImagery` and `SlicePool` are gone. (If D1 is answered C, compositing stays where it is, and this bullet is dropped.)
- The globe is content per D2: one terrain source and ordered imagery layers, placed per body as an item.
- The Viewer still gets its defaults, from the ion module once CS-269 lands.
- The globe and imagery parity suites give the same results as the previous commit, and a Dyno measurement of terrain loading shows no regression, with run IDs cited.
- `npm run surface` is run, `api/surface.txt` is committed, and the handbook's globe pages say how a terrain or imagery source plugs in.

### 3.6 CS-556, glTF files through the seam

- A `gltf` kind, a `whole` source: `engine.open({ url: "model.glb" })` gives content, and `world.add` places it. `Engine.loadModel` stays as shorthand.
- It decodes on Jobs with the same parser 3D Tiles content uses.
- Its features carry stable IDs from `EXT_mesh_features`, and a pick returns them (CS-815).
- Animations play through the item. Node transforms as items follow CS-454's answer; until then they stay as today.
- glTF 2.1's external references are not required. When Khronos publishes its schema, a follow-up is proposed.
- `npm run surface` is run, and `api/surface.txt` is committed.

### 3.7 CS-557, MVT through the seam

- An `mvt` kind, a `tree` source on the kit over web Mercator or a declared tile matrix set. Its protobuf decodes on Jobs into `FeatureSink` rows, and it overzooms past the server's last level.
- The vector pipeline (CS-261) draws it, draped on terrain.
- A style in the styling language binds to its tags through its schema. Whether to accept MapLibre style JSON as a front end comes back as a question.
- A label that straddles a tile edge appears once, tested on a fixture.
- A pick returns the feature's properties and stable ID.
- Tests use recorded tiles, with no outside service.

### 3.8 CS-558, Esri services through the seam

In the design's order: map and tile services, feature services, I3S scene layers, elevation.

- Map and tile services load as imagery through CS-810's contract, tiled and by box (`export`).
- Feature services load as features by extent, paged and quantized, into `FeatureSink`, with the service's fields as the schema. The write capability is declared from the service's own, and stays read-only until CS-831's writers.
- I3S scene layers load as a `tree` source on the kit: node pages, geometry buffers, Draco and attribute buffers.
- Elevation services load as a terrain kind, with a LERC decoder from CS-811.
- Each is tested on recorded responses, with no outside service.
- This is large. The main session may split I3S and elevation into items of their own (a question below).

### 3.9 CS-559, USD through the seam

- D3's spike is done and its numbers recorded: size, start time in a worker, threads, and what a strict CSP needs. "Can't tell" is an acceptable answer where no build exists.
- A `usd` kind, a `whole` source on the runtime D3 chose. A fixture stage with a reference, a payload and a variant loads, and the payload loads only when it's in view.
- `UsdPreviewSurface` materials draw through the material system, point instancers through instancing, and `SemanticsLabelsAPI` labels reach picks (CS-815).
- Time samples play through the views' clock.
- A new dependency comes in only with the owner's yes.

## 4. What this plan leaves to others

- **Ion (CS-269)** builds `AssetResolver` for ion and iTwin on item A. It should need A as well as CS-552.
- **The editing write path (CS-831)** designs what A's types carry. A follows its design rather than leading it.
- **An outside tiling engine (CS-806)** checks the seam against a Cesium Native build, and proposes any change before beta.1.
- **The catalog seam (CS-818)** returns `AssetRef`s and needs nothing from this plan beyond A.
- **Gaussian splats (CS-277)** and point clouds (CS-276) are the render features' next users after the globe.
- **1.x's formats (CS-668)** and PostGIS (CS-663) are kinds on A, beside these.
