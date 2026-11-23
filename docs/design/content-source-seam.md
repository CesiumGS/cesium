# The content-source seam: `ContentSource` (design, 2026-11-21)

**What this holds:** The design of the one interface every content source implements, `ContentSource`, for CS-552. The owner's call is CS-551 ([content sources as modules](../decisions/2026-11-16-content-sources-as-modules.md)): 3D Tiles, the globe's terrain and imagery, glTF files, MVT, Esri services, USD, PostGIS and code an application writes all load through it, built now. The plan that builds it is [2026-11-21-content-source-seam.md](../superpowers/plans/2026-11-21-content-source-seam.md). The seam's core is built (CS-847, `packages/core/src/source/`, experimental API); no source has moved behind it yet. Where the built names differ from this note's working names, the code is right: the raster sink is `ContentSinks.images`, `ResolvedAsset.kind` is optional (the registry asks each kind when a plain URL names none), and `SourceTick` also carries the invalidations applied since a source's last update.

**What it supersedes.** [modular-renderer.md](modular-renderer.md), whose "don't introduce a module system, a package split or dynamic registration yet" no longer holds. Three of its parts carry over: the import-boundary tiers, data-only contracts between tiers, and the styling language's compiler kept apart from 3D Tiles' binding (`FeatureStyle`). The bundle check (`scripts/checkBundle.mjs`) stays as the baseline (CS-553), not as a gate.

**What it read.** Main at `f112dc0903`, 2026-11-21. CS-809 (the fetch and credential provider), CS-814 (camera records) and CS-49 (`src/ir/`) were changing `src/io/`, `src/streaming/`, `src/globe/`, `src/tiles/` and `src/ir/` while this was written, so line numbers are as of that commit.

**What to read first.** "The interface in one page", then "Decisions for the owner" at the end. The rest is detail for each source and each requirement.

## Where today's code stands

Read on `f112dc0903`. Counts are rough. Paths are under `packages/core/src/`.

- **Content and its place are already apart, for tilesets only.** `engine.loadTileset(url)` gives the content (tree, selection, cache), and `world.add(tileset, { placement, opacity, tint, viewMask })` gives a `SceneItem` ([scene-items.md](scene-items.md)). A tileset can have several items, with one selection and one cache. `World.add` takes only a `Tileset3D` (`scene/World.ts:898`), and refuses a globe (`streaming/Tileset3D.ts:729`).
- **Streaming writes through two narrow interfaces.** `DrawSink` (meshes, transforms, draws, materials, clips, pool pressure) and `TilesetHost` (the request scheduler, the other tilesets, the upload budget, `loadGltf`, `uploadModel`, `wake`), both in `streaming/DrawSink.ts`. The import-boundary test (`test/importBoundary.test.ts`) keeps the content tier off the renderer and the GPU.
- **A tile source exists, inside the tileset.** `TileSource` (`streaming/tilesetTypes.ts:23-61`) owns a tree's root, loader and placement, and its optional members (heights, rays, clips, `unloadTile`, `createSelection`) are all terrain's. Its one implementation is `TerrainSource`. A 3D Tiles tileset has no source object: `undefined` means 3D Tiles.
- **The globe is a tileset.** `Globe extends Tileset3D`. About 18 lines of `Tileset3D.ts` branch on the source, and 8 call sites outside it test `isGlobe` (height captures, clamping, the engine, the terrain query backend). The globe's `imagery` and `lights` fields live on `Tileset3D`. CS-554's first done-when undoes this.
- **Imagery is a thin provider, composited outside the frame graph.** `ImageryProvider` (`globe/ImageryProvider.ts:9-25`) is a URL per tile with fixed headers, two tiling schemes and attributions. `GlobeImagery` keeps one slice per terrain tile in a texture array from `SlicePool`, and `WebGpuImageryCompositor` (`render/world/contentResources.ts:350`) composites it in its own command encoder. Those are among the boundary test's named exceptions.
- **Decode runs in one content worker; only terrain's runs on Jobs.** The worker (`io/worker.ts`) knows a fixed set of message types: terrain, its deviation, imagery, glTF (b3dm, i3dm, cmpt, glb through `io/gltfParse.ts`), stars, the sky pack and the glare kernel. `pnts` isn't parsed yet. Terrain posts `Jobs.submit` with priorities and dependencies (`globe/TerrainSource.ts:670`, `:912`). 3D Tiles content and imagery use plain worker requests. A module can't add a message type today.
- **Requests share one scheduler; caches don't.** One `RequestScheduler` per engine, with a window per origin (`streaming/RequestScheduler.ts`), which imagery uses too. Tilesets take free slots in update order; arbitration across them is designed but not built ([tile-selection-and-memory.md](tile-selection-and-memory.md), "Scheduling across tilesets"). The per-tick upload budget and the world's pool pressure are engine-wide, but each tileset has its own byte cache (`cacheBytes`, 512 MiB by default).
- **Vectors and points write the world directly.** `VectorLayer` and `PointSource` (`vector/`) call `World` (`addPointMesh`, `addDraw`, `addFrameCompute`) rather than a sink. The "splats" in today's code are point symbols rasterized in the cull pass (`World.drawSplats`, drawn in the opaque pass). There is no Gaussian-splat content.
- **Styling compiles per consumer.** `FeatureStyle` compiles a style expression against a tile's metadata into a `CustomShader`, and `compileVectorStyle` does the same over a `PointSource`'s layout. Both call `compileStyleExpression`.
- **Queries have two backends.** Heights delegate to the terrain source. Rays go either to the terrain's CPU ray target (`globe/terrainRay.ts`) or to the world's GPU ray casts (`World.castRays`).
- **Credits are per tileset.** `Tileset3D.credits()` merges imagery's and each selected tile's copyright. No engine-wide collection exists.
- **Ion** is called from core (`io/ion.ts`: `resolveIonAsset`, `ionDefaults`), from `ImageryProvider.ts` and from the Viewer ([ion-as-a-module.md](ion-as-a-module.md)). `resolveIonAsset` already returns most of a resolved asset: a URL, headers, a type and attributions.
- **Passes** are registered in one function, `buildViewFrame` (`render/view/viewFrame.ts:161`), in a fixed order: shadows, culls, sky, prepass, opaque, translucent, composite, picks, exposure, present. Two hooks let others in: post stages (`createPostStage`, `GraphStage` in `render/post/chain.ts:99`), after the scene is drawn, and `World.addFrameCompute`, a compute step before culling. Nothing lets content add a pass that draws in the scene.
- **Worker mode** is a protocol table (`thread/protocol.ts`), with no façade built.
- **Other formats:** none for MVT, Esri, I3S, USD, GeoJSON, KML or CZML. glTF files load through `Engine.loadGltf` and `loadModel`.

## The interface in one page

Five layers, each a seam of its own, from the asset a host names to what the renderer draws. Only the middle one is `ContentSource`.

| Layer                 | Interface                          | Who implements it                                              | Item               |
| --------------------- | ---------------------------------- | -------------------------------------------------------------- | ------------------ |
| Bytes                 | `FetchProvider`, `DataResource...` | The engine's default; a host's own (proxies, signing, offline) | CS-809, CS-808     |
| Where an asset lives  | `AssetResolver`                    | Plain URLs; ion; iTwin; a host's own service; a catalog's item | CS-269, CS-818     |
| What the content is   | `SourceKind`, `ContentSource`      | One module per format or service                               | CS-552 (this note) |
| What the engine holds | sinks, the edit layer, queries     | The engine                                                     | CS-552, CS-831     |
| How it's drawn        | the renderer, `RenderFeature`      | The renderer; a module for a new primitive (splats)            | CS-33, this note   |

```ts
// Working names: the public API review (CS-102) names them.

/** One kind of source, registered by a module: "3d-tiles", "quantized-mesh", "wmts", "gltf", "mvt", ... */
interface SourceKind {
  readonly id: string;
  /** Claims a resolved asset by its declared kind, media type or first bytes. */
  accepts(asset: ResolvedAsset): boolean;
  open(asset: ResolvedAsset, host: SourceHost): ContentSource;
  /** Worker job types its decode needs, each a module loaded by URL in every worker. */
  readonly decoders?: readonly ModuleRef[];
  /** The renderer half, only when it draws something the renderer doesn't know. */
  readonly renderFeatures?: readonly ModuleRef[];
}

/** One open source: content that scene items place. */
interface ContentSource {
  readonly kind: string;
  readonly capabilities: SourceCapabilities;
  readonly ready: Promise<void>;
  /** Where and when it has content: bounds, time span, reference frame or CRS. */
  readonly extent?: SourceExtent;
  /** The feature properties a style can bind to (names, types, enums). */
  readonly schema?: FeatureSchema;
  readonly credits: CreditList;
  /** One tick: the views that show it, the time, and what the budget granted. */
  update(tick: SourceTick): void;
  /** Answers it gives beyond what its output answers (terrain's heights where nothing is loaded). */
  readonly queries?: SourceQueries;
  /** Edits back (CS-831). Absent on a read-only source. */
  readonly writer?: SourceWriter;
  destroy(): void;
}

interface SourceCapabilities {
  /** How it decides what to load: a tree by view, the whole asset, by its receivers, or by push. */
  readonly selection: "tree" | "whole" | "derived" | "push";
  /** What it writes: "meshes", "raster", "features", "points", or a registered render feature's id. */
  readonly outputs: readonly string[];
  /** False for a live feed: "settled" (CS-816) never waits for it. */
  readonly settles: boolean;
  /** It pushes changes (below), so nothing polls it. */
  readonly pushes: boolean;
  /** CS-831's write capabilities. `READ_ONLY` unless the source can write. */
  readonly write: WriteCapabilities;
}

/** What the engine gives a source. A source holds nothing else of the engine's. */
interface SourceHost {
  readonly fetch: FetchProvider; // CS-809: every request, credentials, proxies
  readonly resources: DataResourceProvider; // CS-808: named outside data
  readonly jobs: SourceJobs; // decode on the worker pool, by priority, cancelable
  readonly budget: BudgetClient; // wants in, grants out, shared by every source
  readonly sinks: ContentSinks; // where its output goes
  readonly clock: SourceClock; // its world's scene time, with epoch and time scale; wall time apart (CS-960 A)
  /** A push: content changed. Wakes the engine; nothing polls. */
  changed(change: SourceChange): void;
}
```

A source is written once and runs the same on either thread, because it only ever sees `SourceHost`. That is what lets the same module run in worker mode, in Node tests over an in-memory host, and inside a host application that supplies its own fetch, resources and credentials.

## What a source provides

### Selection

Each source decides what to load. The engine decides how much any source may load. That split is the seam's main line, and it's what admits an outside tiling engine (CS-806): a source that brings its own tree and selection still asks the same budget.

- **`tree`:** content in a hierarchy chosen by view: 3D Tiles, terrain, I3S, MVT, PostGIS by tile. Most of them use the tile-tree kit (below) and never write selection themselves.
- **`whole`:** one asset, loaded once, maybe with parts deferred: a glTF file, a USD stage, GeoJSON, CZML. Selection is trivial, except where the asset defers parts (USD payloads, glTF 2.1's external references), which load by view like tiles.
- **`derived`:** chosen by what it lands on. Imagery has no geometry of its own: the tiles it needs follow the receivers' tiles (terrain today, any ground later under the surface-projection design). The receiver asks the raster source for a footprint at a resolution.
- **`push`:** content arrives from the source's side, not from a view's request: a live feed of moving objects or sensor readings.

**The budget, shared by every source.** `SourceTick.grant` carries what the engine allots to this source this tick, and `BudgetClient.want(...)` is how a source asks. A want has a class (`now` for a hole in a view, `refine`, `prefetch`), a benefit (screen-space error removed times screen coverage times view weight), a cost (bytes, decode time) and an origin. After every source has updated, the engine arbitrates per origin and over one byte budget for all sources (today each tileset has its own `cacheBytes`), class first, then benefit per cost, with aging. That is the design in [tile-selection-and-memory.md](tile-selection-and-memory.md), "Scheduling across tilesets" and "Budget-driven refinement", made the seam's contract. Classes make sources comparable where their priority numbers aren't.

**The tile-tree kit.** Today's tuned machinery becomes a kit that `tree` sources share, not part of the interface: `BudgetedSelection` and `Stepwise` traversal, `TouchOrder` and eviction, LOD transitions and geomorphs, curvilinear maps, occlusion and casters. A source built on it supplies its tree (nodes, bounds, errors, content keys) and its decode, and the kit does the rest. 3D Tiles, terrain, I3S and MVT use it. Cesium Native doesn't, and doesn't need to.

### Requests and decode

- **Every request goes through `host.fetch`,** CS-809's provider, so credentials renew, proxies rewrite and enterprise headers apply to every source alike. Its retries and backoff follow CS-147's per-tile episodes, and they count against the origin's window.
- **A source's credentials stay on their origins** (CS-966). A source's headers, and a `Credential` that lists no origins, go only to the source's own origin; a `Credential` that lists origins goes only to those. The host's request hook decides what is sent (CS-1034 A): what it returns goes as is, and a hook that moves a request for the source's origin to a third party's server, a mirror, sends the source's headers there. Only a `Credential` that lists its origins is checked again on the hook's URL. A request that carries a source's or an origin rule's header other than `Authorization` (which fetch strips on a cross-origin hop), `Accept` or `Prefer` follows redirects through the provider (CS-1033 A): in Node each hop is checked as a fresh request, and in a browser, which hides where a manual redirect goes, the redirect is refused.
- **Decode is a job type a module registers, always on Jobs.** A source's decoders are modules loaded by URL into every worker of the pool, each a pure function of its payload whose large arrays are transferred, as `worker.ts`'s message types are today. 3D Tiles content and imagery move from plain worker requests onto `Jobs.submit`, as terrain already is. A job's priority is its want's place in the arbitration, read each time the queue sorts, so a job follows its tile as the camera moves. A source never makes its own worker.
- **Output is plain data:** `MeshData`, columnar feature and point rows, images or image bytes, property tables. That's what crosses from a worker, and what a sink takes.

### What it hands the renderer: sinks

A source never sees `World`, the renderer or a GPU type. It writes into sinks, each a narrow, data-only interface like today's `DrawSink`:

| Sink          | Takes                                                                                            | Today                                 |
| ------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------- |
| `DrawSink`    | Meshes, transforms, draws, materials, clips: what tiles and models are                           | `DrawSink`, as it is                  |
| `RasterSink`  | An image with its footprint (a tile in a tiling scheme, or a box in a CRS), its time and credits | `GlobeImagery` reads providers itself |
| `FeatureSink` | Columnar vector features: points, lines, polygons, labels, with properties and a clamp mode      | `VectorLayer` writes `World` itself   |
| `PointSink`   | Columnar points: point clouds, tracks, sensor readings                                           | `PointSource` writes `World` itself   |
| custom        | Rows for a registered render feature (Gaussian splats), plain data its renderer half reads       | none                                  |

**Two rules on everything a sink takes:**

- **Stable identity (CS-815).** Every feature, draw and point carries an ID made from content (source, content key, feature-ID set, feature ID) or given by the host. The same feature gets the same ID when its tile reloads, at another level, or in another run. The edit layer, picks, ID images and ray hits all key by it.
- **Credits ride with content.** A tile's or image's credits come in with it, so the credits shown are those of what's on screen, as Bing's per-tile credits need (CS-810).

**Queries run on what the engine holds.** Picks, rays, heights and clamping run over the sinks' content and its acceleration structures, so they work for every source, an outside tiling engine's included. A source may add answers of its own in `queries`: terrain answers a height where no tile is loaded yet, and a feature service answers a lookup by ID.

## How styling binds

The styling language stays in core and lowers to Cesium IR ([core-ir.md](core-ir.md)), as decided. What binds a style to a source is the source's `schema`: the properties its features carry, with their types and enums. A style is compiled once per style and schema pair into a kernel, and the sink's property tables feed it, keyed by stable ID.

- **3D Tiles' binding** (`FeatureStyle`, the metadata-to-property mapping, the 1.x conformance tests) moves into the tiles module, as [modular-renderer.md](modular-renderer.md) proposed.
- **Each source maps its own metadata to a schema:** `EXT_structural_metadata` for 3D Tiles and glTF, MVT tags, Esri fields, USD primvars and `SemanticsLabelsAPI` labels.
- **Front ends for other style formats** compile to the same language, so they don't need a second compiler: a MapLibre style's layers for MVT, an Esri renderer's JSON for feature services. Whether to accept each is a scope question for its source (CS-557, CS-558).

## How it runs on Jobs and in worker mode

The worker-mode façade's decisions hold ([2026-11-13-worker-facade.md](../superpowers/plans/2026-11-13-worker-facade.md), "Decisions in force"): one API on the main thread, the engine on either thread, and code that runs inside the engine's tick loaded as a worklet-style module by URL. So:

- **A source kind is a module reference,** not a live object: `{ id, module: new URL("./csvSource.js", import.meta.url) }`. The engine imports it on its own thread. First-party kinds are exported this way by their entry points (`tiles3d` from the tiles entry, and so on). An application's own kind (CS-820's example) is the same.
- **Options are plain data,** structured-clonable, because in worker mode they cross threads. A source's callbacks to the application are events, delivered on the main thread through the façade, never functions passed in.
- **Three places code runs:**
  - the source's `update`, on the engine's thread, inside the tick, under the tick's phases;
  - its decoders, on the worker pool, through Jobs;
  - its main-thread steps, in the apply phase (`Engine.jobBudgetMs`).
- **Main-thread mode runs the same code in place.** No source may offer a synchronous read that worker mode can't, which the façade's API tests enforce in both modes.

## How ion and other hosts supply content

**An asset reference goes in, and a resolved asset comes out.** This is the interface [ion-as-a-module.md](ion-as-a-module.md) asked for ("where it lives, how to authenticate, what credit it needs and what kind of content it is"), and this note proposes it as CS-269's shape (decision 6):

```ts
type AssetRef =
  | { url: string | URL; kind?: string; options?: PlainData }
  | { ion: number; server?: string }
  | { resolver: string; id: string; options?: PlainData };

interface AssetResolver {
  readonly id: string; // "url", "ion", "itwin", or a host's own
  accepts(ref: AssetRef): boolean;
  resolve(
    ref: AssetRef,
    init: { signal?: AbortSignal },
  ): Promise<ResolvedAsset>;
}

interface ResolvedAsset {
  readonly kind: string; // a SourceKind's id
  readonly url: URL;
  readonly credentials?: CredentialProvider; // CS-809: renewable, refreshed on a 401
  readonly credits: CreditList;
  readonly version?: string; // for invalidation, and for edits' optimistic concurrency
  readonly options?: PlainData; // kind-specific, such as Bing's imagery style
}
```

- **Ion is a resolver and a credential provider, not a source.** It maps ion's asset types to kinds (3D Tiles, terrain, imagery, glTF, CZML, KML, GeoJSON), renews the asset token through CS-809, and brings ion's credits. Its Bing lookup and the Moon's loading move with it into `@cesium/next/ion`, and core imports none of it (CS-269).
- **iTwin is a second resolver,** which checks that the interface isn't shaped around ion.
- **A host supplies content its own way** with a resolver of its own: its asset service, signed URLs from its back end, or a local bundle, with its own `FetchProvider` underneath.
- **The loading call is one entry for every source:** `engine.open(ref)` resolves, picks the kind, opens the source and returns the content, and `world.add(content, options)` places it. `loadTileset(engine, url)` stays as the tiles entry's shorthand.

**Catalogs (CS-818) need nothing more.** A catalog is a query seam, beside this one: a query goes in, asset references come out, with extents, times and credits. Each reference then goes through `engine.open` like any other. A STAC item's signed URL renews through the resolved asset's credentials.

**An outside tiling engine (CS-806) is a source kind.** Cesium Native in WebAssembly would be one `ContentSource` whose `update` runs its own tree, selection, cache and ion client in a worker. The seam admits it because of four choices made above:

- the source owns selection, so its tree never has to be the kit's;
- the budget is a protocol of wants and grants, not a callback into the kit;
- its requests go through `host.fetch`, so credentials and proxies still apply;
- its output goes through sinks as plain data, so picks, heights, clamping, credits and the shared budget stay the core's.

CS-806 checks this against a build, and any change it needs comes back as a proposal before beta.1.

## Push updates

A source that `pushes` calls `host.changed(change)`. The engine wakes, and the change is applied in the apply phase under its budget. Nothing polls.

```ts
type SourceChange =
  /** Tiled content changed upstream: drop these keys or this region, and select again. */
  | {
      kind: "invalidate";
      keys?: readonly ContentKey[];
      region?: SourceExtent;
      version?: string;
    }
  /** Features others changed: CS-831's change feed in. */
  | { kind: "features"; changes: ChangeSet }
  /** Time-stamped samples: positions, poses or readings for IDs already known. */
  | { kind: "samples"; samples: SampleBatch };
```

- **The source owns its transport:** a WebSocket, server-sent events, MQTT over WebSocket, WebTransport, or a host's channel. It opens it through `host.fetch`, so proxies, headers and credentials apply. CS-809's provider covers `fetch` only today, so it needs a `connect` for streams. That is a question below, not a change here.
- **Samples carry their times.** In real time they apply when they arrive. In stepped mode (CS-816) they're buffered and applied at the stepped time, so a replayed feed gives the same results each run. A live feed's `settles` is false, so "settled" doesn't wait for it.
- **Invalidation is how a tiled source follows edits upstream:** a re-tiled region, a new version of a feature service, or a 3D Tiles source edited and tiled again (CS-831).
- **Moving objects share the core's budget.** Their rows go into `PointSink`, `FeatureSink` or `DrawSink`, which count against the same pools as tiles (CS-821's example shows it).

## Render passes that modules register

Today only post stages can be added from outside, after the scene is drawn. Gaussian splats, and other content the renderer doesn't know, have to draw inside the scene: depth-tested against tiles, sorted with the translucent pass, picked, shadowed or not. So a module may bring a renderer half, a `RenderFeature`.

```ts
/** The renderer half of a module, one per renderer ("webgpu" first; "webgl2" later or never). */
interface RenderFeature {
  readonly id: string; // the custom sink it reads
  readonly renderer: "webgpu" | "webgl2";
  create(ctx: RenderFeatureContext): RenderFeatureInstance;
}

interface RenderFeatureInstance {
  /** Its rows changed: mirror them to its GPU tables, as `WorldMirror.sync` does. */
  sync(rows: CustomRows): void;
  /** Its passes, in named slots, each declaring what it reads and writes. */
  register(graph: PassRegistrar, view: ViewInfo): void;
  destroy(): void;
}
```

- **Slots, not free order.** `opaque` (after the surface pass, writes depth and IDs), `translucent` (sorted with the translucent pass, reads depth), `ground` (onto receivers, as imagery and decals do), `overlay`, and the post slots that exist (`scene`, `exposed`, `display`). It grows `GraphStage`'s model into the scene passes, and keeps the rule that pass order is fixed in one place.
- **It says what it does for queries:** writes the ID target or is unpickable; gives a ray adapter or is skipped by rays; casts shadows or doesn't. Silent defaults would make picks lie.
- **The GPU rules hold for it:** shaders in Slang, loops bounded by constants, buffer indices clamped. The renderer half lives in the renderer tier and loads with the renderer, so a source's content half stays free of GPU types.
- **First users are first-party:** globe imagery compositing (which moves `WebGpuImageryCompositor` into the frame graph and retires `GlobeImagery`'s and `SlicePool`'s boundary exceptions), Gaussian splats, and the point pipeline (today's `addFrameCompute` steps and point-symbol splats). Whether outside modules can register one, and when, is a decision below.

## Room for editing (CS-831)

CS-831 designs the write path. This seam leaves room for it with three things that are in alpha.1, and nothing more:

- **The capability declaration:** `SourceCapabilities.write`, with `update`, `insert`, `delete`, `versioned`, `transactions` and `live` flags. Every source in alpha.1 declares `READ_ONLY`.
- **The override contract:** sources key everything they write by their own keys, from which the engine makes feature IDs (above), and the engine keeps an edit layer between the sinks and the renderer. The layer hides, replaces and inserts features by feature ID, and re-applies its overrides when a tile reloads. Sources never see overrides. So the contract a source must keep is narrow: the same ID for the same feature across reloads and levels, or a declared mapping where an ID changes by level.
- **The change-set type,** plain and serializable, so it can be undone, redone, replayed and sent:

```ts
interface ChangeSet {
  readonly id: string;
  readonly source: string; // the content's ID
  readonly base?: string; // the version it was made against
  readonly ops: readonly ChangeOp[];
  readonly meta?: { author?: string; time?: string };
}
// As built (CS-847, CS-952 A): each op names its feature by the source's
// own key, with the engine's feature ID beside it; CS-861 extended the rest.
type ChangeOp =
  | { op: "insert"; key: string; id?: FeatureId; feature: FeatureData }
  | { op: "update"; key: string; id?: FeatureId; patch: FeaturePatch /* … */ }
  | { op: "delete"; key: string; id?: FeatureId; before?: FeatureData /* … */ };

interface SourceWriter {
  commit(
    changes: ChangeSet,
    init: { signal?: AbortSignal },
  ): Promise<CommitResult>;
}
type CommitResult =
  | { ok: true; version: string; keys?: Record<string, string> } // provisional key to the source's
  | {
      ok: false;
      conflicts: readonly {
        key: string;
        id?: FeatureId;
        mine: ChangeOp;
        theirs?: FeatureData;
        base?: FeatureData;
      }[];
    };
```

The change feed in is the `features` push above. What each writer does (OGC API Features Part 4, WFS-T, iTwin changesets, USD layers, re-tiling) is CS-831's.

## How each source fits

What each needs that 3D Tiles doesn't. All of them use the fetch provider, Jobs, the shared budget, stable IDs and sinks.

| Source        | Selection | Writes                   | Needs beyond 3D Tiles                                                                                                           |
| ------------- | --------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| 3D Tiles      | `tree`    | meshes, points, custom   | The reference case. Implicit tiling, multiple contents and the 1.1 metadata (CS-272); splats as custom rows                     |
| Terrain       | `tree`    | meshes, surface          | Height queries, skirts, upsampling, geomorphs, receivers for imagery, the body's occluder, a tiling scheme with no tileset JSON |
| Imagery       | `derived` | raster                   | No geometry; chosen by receivers; tiling schemes and box requests (CS-810); per-tile credits; layer order and blending          |
| glTF files    | `whole`   | meshes                   | No tree; animations and node transforms as items (CS-454); external references and deferred parts                               |
| MVT           | `tree`    | features                 | Features, not meshes; overzoom; labels placed across tiles; draping; a style front end                                          |
| Esri services | varies    | raster, meshes, features | Several kinds: map and tile services, elevation, feature services (paged queries, edits), I3S scene layers                      |
| USD           | `whole`   | meshes, custom           | Composition (layers, references, payloads, variants); time samples; its materials; point instancers; a USD runtime              |
| PostGIS       | `tree`    | features                 | Never direct from a browser: a server the app names (CS-663); queries by view and level                                         |
| Live feeds    | `push`    | points, features, meshes | No requests by view; time-stamped samples; never settles                                                                        |

**3D Tiles.** The reference source, and the one the kit is built from. It moves behind the seam as a kind (`3d-tiles`) in `@cesium/next/tiles`, with `FeatureStyle` and its parsers. `Engine.loadTileset`, `addTileset` and `addTerrain` move out of `Engine` (`src/scene/Engine.ts:1054-1180`), and `Globe` stops extending `Tileset3D` (CS-554).

**The globe's terrain.** A `tree` source of its own kind, quantized mesh first, built on the kit but not on `Tileset3D`. Today's `TileSource` (`streaming/tilesetTypes.ts:23-61`) is the start: its optional members are what terrain needs beyond a tree, and they become the source's `queries` and its kind's options. It needs what 3D Tiles doesn't:

- a tiling scheme with an implicit tree and an availability tree (`layer.json`), not a tileset JSON;
- height queries in `queries`, answering where no tile is loaded, which clamping and the camera's collision use;
- skirts, upsampling when a child is missing, geomorphs and refits on Jobs;
- the body's occluder, which other sources' selection reads (`DrawSink.occluders`);
- being a receiver: imagery's tiles are chosen against its tiles.

CS-810's terrain-provider contract (quantized mesh, OGC API Coverages) is the decode side of this kind.

**The globe's imagery.** A `derived` source: the receivers' tiles choose its tiles, not the views. It writes images with footprints into `RasterSink`, and the engine composites them on receivers through a first-party render feature. That's where `GlobeImagery` and `SlicePool` go, and it retires their GPU exceptions in the content tier. CS-810's provider contract (`fetchTile`, OGC tile matrix sets, box requests, renewable credentials, per-tile credits) is how an imagery source fetches. Several layers, their order, opacity and blending are the globe's, not the source's.

**glTF files.** A `whole` source that decodes one file on Jobs (the same parser 3D Tiles content uses, shared by both modules) and writes meshes. It needs what tiles don't:

- animations and node transforms, which CS-454 may make items of their own;
- KHR extensions beyond tiles' use (CS-273);
- glTF 2.1's external references, which make a file a small tree: referenced files load by view like tiles, and once each.

**MVT.** A `tree` source over a web Mercator scheme that writes features, not meshes, into `FeatureSink`, for the vector pipeline (CS-261) to draw. Beyond tiles it needs:

- overzoom past the server's last level;
- labels placed across tile edges, so collision has state across tiles;
- draping and clamping onto terrain and tilesets;
- a style front end (a MapLibre style's layers) compiled to the styling language.

**Esri services.** Not one source but four kinds, in this order (a call made here, under CS-558):

1. map and tile services, as imagery providers through CS-810's contract;
2. feature services, as features with paged, quantized queries by extent, and later edits through `applyEdits` (CS-831);
3. I3S scene layers, a `tree` source on the kit: node pages, geometry buffers, Draco and separate attribute buffers;
4. elevation services, as a terrain kind, which needs a LERC decoder (CS-811).

**USD.** A `whole` source whose payloads load by view, like tiles. It needs a USD runtime to compose a stage (layers, references, payloads, variants, time samples), which no part of the engine has. Its materials (`UsdPreviewSurface`, MaterialX) go through the material system, point instancers through instancing, and `SemanticsLabelsAPI` labels through CS-815. Which runtime is a decision below: it is a new dependency or a large build.

**Also through the seam:** PostGIS (CS-663) as features by view through a server the app names, live feeds as `push` sources, point clouds and splats as 3D Tiles content or files, and 1.x's formats (CZML, KML, GPX, GeoJSON) as `whole` sources (CS-668).

## Sources and scene items

**A source is content; an item is content placed in a world.** `engine.open(ref)` returns the content, and `world.add(content, options)` returns a `SceneItem`, as tilesets do today. One content can have several items, with one selection over all of their views and one cache. This keeps today's small version of scene items, and every kind of source gets it.

**The globe as an item.** The globe becomes content composed of sources, not a tileset:

- one terrain source (or none: a smooth ellipsoid);
- an ordered list of imagery layers, each a raster source with its opacity and blending;
- added per body at its anchor: `world.add(globe, { anchor: earth })`.

The Viewer builds Earth's from ion's defaults. The same layers could later drape on other receivers under the surface-projection design. How close this comes to USD's references and payloads is CS-454's brainstorm, which the owner set for before the API review together with this note. So it is raised below rather than settled.

**As built (CS-847).** The core holds these rules, which the sections above leave open:

- **Two IDs (CS-957 A, CS-1031 A).** A **feature ID** (`FeatureId`) is made from the content's canonical source and the source's own key for the feature (`RowIdentity.names`, or a draw's `DrawOptions.id`), and nothing else: never from a scene item or the content ID (`OpenOptions.id`, open order). So it is the same across opens, worlds and runs: one tileset opened twice, or placed in two worlds, has one set of feature IDs, a peer's change set that carries IDs applies, and labels saved by feature ID apply after the source is opened again. Rows, the edit layer and change sets name it, so every item of a content shows the same edits. Two open contents of one source share feature IDs; each keeps its own edit layer, and labels set on a feature ID reach both, as the world's identity table keeps labels by ID.
- **The canonical source** (`SourceContent.source`) is made in one place, `assetSource` in `packages/core/src/source/sinks.ts`, in three parts. First, CS-815's `canonicalSource` of the URL the asset's resolver gave: the scheme, host, port and path the URL parser finds, without user information, the query or the fragment. A token a server puts in the path stays, since nothing in a path says it is one. A Cesium ion asset keeps its version (`v`), percent-encoded, so a new version of the data gets new feature IDs and a `v` that decodes to `&access_token=…` stays one value. A data URI becomes its media type and the MurmurHash3_x86_128 of its bytes. Second, the query parameters, with their values, sorted by name and then value and percent-encoded, so their order in the URL doesn't change an ID. With no declaration, every parameter is kept but the credentials and signatures (CS-1080 A), so `features?layer=roads` and `features?layer=buildings` get different feature IDs. A resolver (`ResolvedAsset.identity`) or a kind (`SourceKind.identity`) that declares `SourceIdentity.params` (experimental) replaces that default: only what it names is kept, so a kind can leave out a page size or a cache buster that would otherwise give new feature IDs. Third, after `#`, which a canonical URL never holds: the asset's `version` (unless it is ion's `v` already), and the options that select the content (`SourceIdentity.options`, Bing's style, say), each as `option.<key>` with its value as JSON. A credential never enters any part, even when declared: the asset's `Credential`'s own query parameters, the parameters and option keys a declaration names in `SourceIdentity.credentials`, and the names on one list, `CREDENTIAL_PARAMS`, beside the default's one function (`undeclaredParams`), both in `sinks.ts`, compared without case. A feature ID is saved by hosts and peers, so a secret in its source would leak, and a value that changes each session (a token, a signature, a signing time, an expiry) would give new feature IDs on every open. The list holds OAuth's `access_token`, plain tokens and API keys (`token`, `key`, `apikey`, `api_key`); AWS S3's signed URLs (`X-Amz-Signature`, `X-Amz-Credential`, `X-Amz-Security-Token`, `X-Amz-Date`, `X-Amz-Expires`); Google Cloud Storage's (`X-Goog-Signature`, `X-Goog-Credential`, `X-Goog-Date`, `X-Goog-Expires`); Azure's shared access signatures (`sig`, `se`, `st`, `sp`, `sv`, `sr`); and CloudFront's signed URLs (`Signature`, `Expires`, `Key-Pair-Id`, `Policy`). A credential the list doesn't know, in a parameter of its own, would enter the ID: a resolver or kind that uses one declares it in `SourceIdentity.credentials`, or declares `params`. An **instance ID** (`InstanceId`) adds the placement: content may have several items in its world, each item places every draw its source writes, and each item's draws carry its identity, keyed by `ContentItem.key`. So one content placed twice gives one feature ID and two instance IDs per draw. An item's key is `ContentItemOptions.id`, else the content ID by the ordinal rule: the content ID while no item holds it, else the content ID with an ordinal (`#2`), reported, the same when a tileset item holds the content ID. Items have no placement of their own yet, so they draw in one place (CS-554). A feature ID's key has its own kind, `feature` (the canonical source and the source's key, with no item and no content ID), so it is never an instance ID, the first item's included. Its canonical text today is the JSON array `["feature", source, key]`, or `["feature", source, batchKey, row]` for an unnamed row (its batch's key and its index), hashed by `hashKey` as CS-815's other keys are. It is experimental, held for the API review (CS-102, CS-1081), and may change before it. The source's keys are one space: a row's name and a draw's `DrawOptions.id` both name a feature, so a change set by key reaches a draw without features too, and `keyOf` answers for both. An instance ID is CS-815's key with the item's key. The world's identity table keeps each content draw's feature IDs beside its instance IDs: `Identified.feature` gives an instance's feature, `identify` takes a feature ID (answering as the first placement that draws it), and labels set on a feature ID show on every placement, under labels set on one instance. The edit layer takes an instance ID as its feature's, so an edit made from any placement's pick reaches every placement: a draw without features by the content's own map, a named feature of a draw with features by the world's identity table (`Identified.feature`). An edit naming an ID the content holds nothing of (an instance ID of a removed item, another content's ID, or a feature not loaded yet) is held, since a feature ID can name a feature that loads later, and reported by count once a tick. Only `SourceContent` sets `DrawIdentity.feature`: a host's own draw that sets it is refused, so it can't take a content's feature ID, its labels or what `identify` says of it. CS-961 puts the feature ID in picks and the ID image, and gives the unnamed features of a draw with features their feature IDs. A source can't set `DrawOptions.identity` on its draws: their identity is their content's and item's. The IDs don't change when an item is removed and the content placed again. Two open contents never share a content ID, since it is their first items' key and so in their instance IDs: a second explicit `id` is refused, and a second content of one URL without an `id` takes an ordinal (`#2`), reported, as a second item of a tileset does. Instance IDs therefore differ per placement and per open; feature IDs don't.
- **Change sets name the source's key (CS-952 A).** Every op, `FeatureVersion` and `Conflict` names its feature by `key`, the source's own, with the feature ID `id` beside it, optional: a server or a peer that knows only its own keys writes and reads change sets without it. Applying one resolves by key (`SourceContent.resolve`, which changes nothing) and refuses it whole when its `source` is neither the content's canonical source nor its content ID, or an `id` isn't its key's. A feed's update or delete naming a key no row, draw or override of the content has is applied as an override that holds until the feature loads, and reported. Such overrides are bounded: a content's feed holds at most `MAX_PENDING_OVERRIDES` (1,024) for features no row or draw has, and past it the oldest go (those whose feature has loaded since are no longer counted), reported once per change set by count, never by key. A feed's delete of its own insert, with no row or draw of the source under it, clears the insert rather than hiding it, and an update of it keeps it an insert, so a vehicle feed that inserts and deletes holds nothing for what it deleted. A replacement shows where its feature does: `feature` gives nothing for a replacement of a feature no row or draw has, as `features` lists it. `keyOf` keeps a feed's keys only while an override holds them, so they grow no further than the overrides, and a row's name goes with the last row that has it. `SourceWriter.read` and `SourceQueries.feature` take keys; `CommitResult.keys` maps an insert's provisional key to the source's. The JSON form is version 0.2.0, still experimental at 0.x; its reader reads its own minor version only, so 0.1.0's ID-only ops are refused.
- **Sources see the scene clock (CS-960 A).** `SourceClock` and `SourceTick.clock` carry the scene time of the content's world (`SceneClock`, the clock picks and camera records read), with its epoch (1970-01-01T00:00:00Z) and time scale (UTC) named, and wall time (`Engine.time`) as a separate field, `wallSeconds`. Every other time in the seam is scene time. A source's camera record is stamped with scene time, as a pick's is. Nothing is stepped until CS-816; on stepped clocks, samples wait for their own world's scene time. In real time a live feed's samples apply when they arrive, whatever their times: one stamped ahead of the scene time shows early, and one behind it shows late. Holding samples until the scene time reaches them comes with CS-816's stepped clock, where a replay needs it.
- **Decoder job types are namespaced** (`<namespace>:<name>`, as "csv:rows") and never one of the content worker's own ("gltf", "terrain", "image"...): `WorkerPool.loadDecoder` refuses them, so a kind can't take over another's jobs. A canceled decode replies at once, so a decoder that never resolves frees its worker's slot; a failed decoder load is tried again by the next job.
- **The byte budget is shared, so prefetch yields everywhere.** While a `now` or `refine` want waits for bytes, no prefetch is granted on any origin; while one waits for a slot, no prefetch is granted on its origin. A grant a source's update threw before acting on goes back, and a settle with a size that isn't a finite number from 0 is reported and counted at what its want asked.
- **Destroyed means closed.** Destroying content cancels its source's jobs, and its sinks' writes and `jobs.submit` throw from then on (a draw sink's releases still pass, so a source's `destroy` can free what it made); its pushes are dropped. `World.add` refuses a destroyed world, and `Engine.removeWorld` destroys the content placed in it.
- **Pushes are bounded.** Queued changes apply under the apply phase's budget; past 10 000 queued between ticks, a source's queue collapses into one invalidation of everything, reported. At most 100 000 samples wait for their times, and a sample with no finite time is dropped.

## Entry points and the bundle

- **Core keeps the seam:** its types, the kind registry, `SourceHost`, the budget arbiter, the request scheduler, the sinks, the edit layer and the queries.
- **Each family of sources is an entry point,** imported only by the applications that use it: tiles (3D Tiles and the tile-tree kit), the globe (terrain kinds, imagery providers, the globe's content), glTF files, MVT, Esri, USD and ion. A module imports another only by the package's name, as the widgets do today, and the import-boundary test enforces it.
- **The measure:** CS-553's baseline, what an application with no tilesets pulls in from streaming today, is checked again after CS-554 and CS-555. The entry points' final names wait on the package names, which are chosen before alpha.1.

## Settled here

- **One interface, coarse:** the source owns selection, and the engine owns the budget. The tuned TypeScript streaming is a kit `tree` sources share, not the interface.
- **Four ways of selecting** (`tree`, `whole`, `derived`, `push`), declared in capabilities.
- **Output only through data-only sinks,** with stable IDs and credits on everything. Queries run on what the engine holds.
- **Decoders are job types a module registers by URL,** and a source kind is a module reference, so every source runs in worker mode unchanged (from the façade's decisions in force).
- **Push is `host.changed`:** invalidation, feature changes and time-stamped samples. The engine never polls. A source may check its own server's version on an interval it declares (`SourceCapabilities.polls`) and turn what it learns into pushes (CS-863, which changed this note's first "no source polls").
- **The room for CS-831:** the capability declaration, the override contract and the change-set type, in alpha.1. Sources declare `READ_ONLY` until CS-831 adds writers.
- **Esri's order:** map and tile services, feature services, I3S, elevation.

## Decisions for the owner

Each is sent back for the main session to file, with options and a recommendation.

1. **Do renderer passes register?**
   - A. Yes, inside the engine first: `RenderFeature` in named slots, used by first-party modules (globe imagery, splats, points) from alpha.1. Outside modules get it in the experimental tier after the API review. _Recommended:_ it is what splats need, it retires two boundary exceptions, and it keeps the public contract out of alpha.1's freeze until it has three users.
   - B. Public from alpha.1.
   - C. No registration: each new primitive is built into the renderer.
2. **The globe as an item (CS-454):**
   - A. The globe is content composed of one terrain source and ordered imagery layers, placed per body as an item. `Globe` stops extending `Tileset3D`. _Recommended._
   - B. The globe stays a special engine object that holds sources, not an item.
   - C. Settle it only in CS-454's brainstorm, and keep `Globe` as it is until then. It would hold CS-554 and CS-555.
3. **A USD runtime for CS-559:**
   - A. A spike first: OpenUSD built to WebAssembly (its size, start time, threads) against a TypeScript reader of a subset (USDZ with USDC and USDA, no plugins). Decide from the spike. _Recommended._
   - B. OpenUSD in WebAssembly.
   - C. A subset reader in TypeScript only.
   - D. No runtime in the engine: USD reaches it through the B-rep tiler as 3D Tiles (CS-305).
4. **Push transport:** CS-809's provider covers `fetch` only. A push source needs streams (WebSocket, server-sent events) under the same proxies and credentials.
   - A. Add `connect` for streams to CS-809's provider, in a follow-up item after CS-809 merges. _Recommended._
   - B. Widen CS-809's scope now, while it's running.
   - C. Push sources open their own connections, outside the provider.
5. **Entry points and their names:** one entry per family of sources (tiles, globe, glTF, MVT, Esri, USD, ion), named when the package names are chosen. _Recommended,_ with the names left to the packaging call.

6. **Ion's interface (CS-269):** hosts and other services implement it, so it is a public commitment.
   - A. An `AssetResolver` (a reference in; kind, location, renewable credentials, credits and version out) and a credential provider, as in "How ion and other hosts supply content". Ion is one resolver, not a source. Public names through CS-102. _Recommended:_ it is the interface [ion-as-a-module.md](ion-as-a-module.md) already described, and `resolveIonAsset` already returns most of it.
   - B. Ion as a content source of its own, wrapping each kind it serves.

## Risks

- **The budget's protocol is new.** Today each tileset sorts its own requests and takes slots first come, first served. Wants and grants across sources is the design in [tile-selection-and-memory.md](tile-selection-and-memory.md), not built. CS-554 must show it doesn't slow today's streaming, measured in Dyno against the previous commit.
- **`Globe extends Tileset3D`** carries order-dependent construction and many branches on the source ([layers-engine-renderer-backend.md](layers-engine-renderer-backend.md), "What the file split had to watch"). Moving it is the riskiest step, so CS-555 runs the globe's parity suites before and after.
- **A module reference by URL** depends on bundlers resolving `new URL(…, import.meta.url)`. Vite and webpack 5 do. Others need checking before beta.1.
