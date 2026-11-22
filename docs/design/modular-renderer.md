# For later: modularizing the renderer without sacrifices now (owner, 2026-11-11)

**What this holds:** For later: how the renderer could be modularized without cost today (owner, 2026-11-11). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

**Superseded (2026-11-21):** by [content-source-seam.md](content-source-seam.md), the design of the content-source seam (CS-552). Its tiers, its data-only contracts, the styling compiler's split from `FeatureStyle` and the bundle measure as a baseline carry over; its "not yet" and "when a second consumer appears" don't. Kept for its history.

**The question.** How would the renderer split into modules, with no cost to what is built now, and should 3D Tiles be its own module or package, with the 3D Tiles styling language compiler? These are notes for later. The rule from [bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md) and [layers-engine-renderer-backend.md](layers-engine-renderer-backend.md) holds: no compromise in the WebGPU approach while the prototype is built.

**A candidate split.** By what an application might leave out:

| Module             | Holds                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Core               | The GPU layer, the frame graph and passes, the loop, views and cameras, the world's tables, queries |
| Surface pipeline   | The surface shader, culling, draw arguments, shadows, picks of triangles                            |
| Vector             | Vector layers, labels, strokes and the coverage kernels                                             |
| Sky and atmosphere | The sky, sun, night sky, clouds, aerial perspective                                                 |
| Globe and terrain  | The globe, imagery, terrain, clamping                                                               |
| B-reps and patches | The render form, patch tessellation, trims, caps, the B-rep query adapter                           |
| Picks and queries  | The query interface, picks, snaps, measurement                                                      |
| 3D Tiles           | Tile trees, selection, requests, cache, parsers, tile styling's bindings                            |

**The seams are in place.** What lets the split happen later:

- `DrawSink` and `TilesetHost` (`src/streaming/DrawSink.ts`): what streaming reads of the engine that runs it, and what content writes into the world. Content never holds the world or the renderer.
- The import-boundary tiers (`test/importBoundary.test.ts`): `gpu`, `renderer`, `scene` and `content`, assigned by file. Content must not reach the renderer or the GPU layer, or the classes that hold both (`World`, `Engine`, `RenderContext`); the renderer may not reach content's internals. A short list of named exceptions (public signatures, imagery's GPU compositing) and the renderer's reads of content (four edges, [layers-engine-renderer-backend.md](layers-engine-renderer-backend.md)) are the debts, and a stale entry fails the test.
- The file split's contexts: `tilesetLoad`, `tilesetUpdate`, `tilesetUpload`, `tilesetEviction` and `tilesetCasters` each take a narrow context (`engine: TilesetHost`, a `DrawSink`) rather than the class, as the world and render functions do.
- The seams' tests (`test/seams.test.ts`): draw records, draw arguments, geometry submission, placements, and ray queries are reached only through one file each, and a bypass fails.
- The entry points already split the foundation: `time`, `frames`, `proj`, `measure` and `widgets` are their own entries, each with a layer rule.

**Cheaply, now.**

- Keep every seam, and keep adding the test with the seam.
- No cross-tier imports: new code lands in the tier it belongs to, and an exception is a named entry with a reason, never a quiet import. The four renderer-reads-content edges are the first to retire.
- Data-only contracts between tiers: a draw's records, a `BrepForm`, a style's compiled form, a query request and its answer are plain data (typed arrays and objects), so a module can be loaded separately, run in a worker, or be replaced.
- Don't introduce a module system, a package split or dynamic registration yet. A boundary that is only a rule in a test costs nothing to move.

**Superseded in part (owner, 2026-11-16):** the content-source seam is built now, with the globe among the sources, rather than "not yet" above or "when a second consumer appears" below. The bundle measure stays, as a baseline. See [content sources as modules](../decisions/2026-11-16-content-sources-as-modules.md).

**Later, when a second consumer appears.** The split into packages (or lazily loaded chunks) follows a real need: an application that doesn't want a part. The work then is mechanical: move files to a package per the tiers, export the contracts, and make the renderer register passes and pipelines instead of importing them (a plugin interface for passes). The entry points are a start; a `@cesium/next/tiles` entry could come before a separate package.

**Should 3D Tiles be its own module?** Where the styling language lives: `src/scene/styleExpression.ts` (about 1,000 lines, "3D Tiles styling expressions (the 1.x `Cesium3DTileStyle` language) compiled to WGSL over a feature's metadata", Node-safe), with `src/scene/FeatureStyle.ts` (about 300 lines) binding it to tile features. `src/vector/VectorStyle.ts` and `src/vector/VectorLayer.ts` also import `styleExpression.ts`, so vectors already share it. The 3D Tiles code is `src/streaming`, plus the globe's tile use (`src/tiles` is 2.5 KB).

- _For a separate module:_ an application with no tilesets (a b-rep viewer, a globe of imagery and vectors, a gallery of f-reps) wouldn't ship streaming's roughly 270 KB of source, the glTF and tile parsers, or the cache. The tier test already says content doesn't reach the renderer, so extraction is cheap, and a clean boundary makes the 3D Tiles 2.0 work ([bodies-frames-and-engineering-coordinates.md](bodies-frames-and-engineering-coordinates.md)) land in one place. It also proves the seams.
- _Against:_ `src/scene` is the biggest directory (about 1.2 MB of source), and the globe, terrain and clamping lean on tiles' machinery, so "tiles" isn't separable from the globe without a deeper split. Extra entry points cost build, test and documentation work. An application that uses the engine mostly for tilesets (most do) sees no saving.
- _The styling language._ [infrastructure-and-geoscience-capabilities.md](infrastructure-and-geoscience-capabilities.md) item 5 plans its generalization: the same language compiles to one GPU kernel interface for every kind of geometry, with run-time data by element ID, time, and display modes. That argues for keeping the language core-level, where it is (in `scene`, shared by vectors, points and tiles), with 3D Tiles' bindings (`FeatureStyle`, the metadata-to-property mapping, the 1.x conformance tests) in the tiles module. The language's compiler is not the 3D Tiles module's, and the module is the language's first user.
- _A proposal:_ keep one package until a second consumer exists. First, move the styling language's compiler and its tile binding apart by file (the compiler into a `style` folder of its own in the scene tier, with `FeatureStyle` in `streaming`), and add a tier rule for it, so the extraction later is a move. Second, let a `tiles` entry point (`@cesium/next/tiles`) export the streaming API, so applications can import only what they use and the bundler drops the rest. Third, a package only if a bundle-size measure (the check in `scripts/checkBundle.mjs`) shows tilesets cost an application that doesn't use them.
- _Open:_ whether the globe belongs with the 3D Tiles module (it renders and streams tiles) or its own; whether the renderer should register its passes (a plugin interface) before any module can leave; and what bundle size an application with no tiles actually pays today, which is the measure to take first.
