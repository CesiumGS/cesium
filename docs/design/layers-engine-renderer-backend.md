# Layers: engine, renderer and GPU backend (notes for later, 2026-11-08)

**What this holds:** Notes on the layers between the engine, a renderer and the GPU backend (2026-11-08). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

The owner's question: Cesium is a rendering engine that contains a renderer, so is "core" descriptive enough, and how would a WebGL 2 backend go in? These are notes, not a design. The rule from §13.14 still holds: no compromises in the WebGPU approach while the prototype is built.

**The usual terms.** These names are from general knowledge of those engines, so check them before quoting them to outside readers.

- **Engine:** the whole runtime: the loop, the scene, streaming, content, queries.
- **Renderer:** turns a description of what is in view into GPU work: passes, pipelines, culling, shadows. Filament separates its engine, renderer and backend this way. Bevy copies the scene into a "render world" in an extract step, and Unreal keeps render-side proxies of its scene objects.
- **GPU backend** (Unreal's RHI, wgpu-hal): a thin layer over a graphics API.

"Core" names none of these. Today it means everything in the main entry point (`.`), from `GpuDevice` to `Tileset3D`, while the `src/core` folder is 62 lines holding an emitter and a clock.

**Where the code stands (grep counts on 2026-11-08, after the file split; rough, and they count matching lines).**

| Measure                                                                                                       | Today                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lines with raw WebGPU calls (pipelines, passes, buffers, textures, dispatches, indirect draws, buffer copies) | `src/render/view` 74, `src/render/world` 12, `src/scene/world` 11, `World.ts` 7, `Engine.ts` 6, `GlobeImagery.ts` 6, `src/scene/renderTarget.ts` 2, `src/scene/heightCaptures.ts` 2. Before the file split, by the same grep: `Engine.ts` 82, `World.ts` 27, `View.ts` 2 |
| `src/streaming`                                                                                               | No files use the GPU API directly, but it imports from `scene` (21 imports, 13 before the split: the types and helpers now come from more files) and `render` (2), and `src/globe` imports from `scene` (7) and `render` (4)                                             |
| `scene` files mentioning WGSL                                                                                 | 17, including the style compiler, which emits WGSL text                                                                                                                                                                                                                  |
| Compute entry points in Slang                                                                                 | 43                                                                                                                                                                                                                                                                       |
| `src/shaders` modules using storage buffers                                                                   | 16 of 25                                                                                                                                                                                                                                                                 |
| GPU types in the public entry point                                                                           | `GpuDevice`, `Capabilities` and limits are exported; `CustomShader` takes `wgsl`                                                                                                                                                                                         |

So streaming's logic is already free of the GPU API. `Engine.ts` and `World.ts` no longer hold the passes: the loop and the scene's bookkeeping stay in them and in `src/scene/world`, and the passes and other GPU work are in `src/render/view` and `src/render/world`. The second pass split the dependencies too (below): those functions take narrow contexts. The seams (`DrawConstants`, `DrawArguments`, geometry submission, bindless resources, ray queries) already narrow how draws are written, but they are inside the renderer. They aren't a boundary between the renderer and the scene.

**A thin backend can't carry WebGL 2.** Today's renderer is GPU-driven: compute culls records, indirect draws consume the result, and vertex shaders pull from storage buffers. WebGL 2 has no compute, no storage buffers and no indirect draws. A wrapper at the API level would have to emulate all three. So there are two different seams, and they do different jobs:

| Seam               | What it enables                                        | Fits                                                                                                                                                               |
| ------------------ | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| GPU backend        | Another API with the same abilities                    | A native WebGPU implementation needs nothing, since it's the same API. Not useful for WebGL 2                                                                      |
| Renderer interface | A second renderer over one scene and one content layer | WebGL 2: CPU culling, attributes and uniform buffers or data textures, one draw call per record or batch, fewer features, declared through capability tiers (§3.1) |

**The options for reaching browsers without WebGPU, cheapest first.** Choose from the browser compatibility data when the time comes.

1. **Nothing new:** an application that needs those browsers uses 1.x there. This costs only documentation.
2. **WebGPU compatibility mode:** closer to today's renderer. Its known problem is storage buffers in the vertex stage (§3.1, §13.9), so it probably needs a second vertex path rather than a second renderer. Not examined further.
3. **A WebGL 2 renderer:** a second renderer, loaded as its own chunk so WebGPU users don't pay for it. It's real work to build and to keep at parity.

**What a second renderer would need besides drawing.** Shaders are the hard part:

- Slang can target GLSL, but whether its output fits GLSL ES 3.00 needs a spike. Nothing has been tested.
- 43 compute kernels need CPU equivalents or a design without them. Some, such as culling, have obvious ones. Others, such as atmosphere tables or FLIP, may need fragment passes or to be dropped.
- The style compiler (`styleExpression.ts`) needs a GLSL emitter or an intermediate form. _Decided (2026-11-13): it lowers to Cesium IR, which has WGSL and GLSL ES 3.00 emitters (§13.42)._
- User shaders written in WGSL wouldn't port. Slang ones might, which would be a reason to steer portable shaders to Slang.
- Picks and depth readback need another path, and queries need their CPU backend.

**The proposed layers.** This is a sketch, and folder names follow later:

| Layer      | Holds                                                                                     | Must not depend on  |
| ---------- | ----------------------------------------------------------------------------------------- | ------------------- |
| Foundation | Math, events, errors, byte readers                                                        | Everything below    |
| Content    | Tile trees, selection, requests, cache, parsers, terrain and imagery logic                | Renderer, GPU types |
| Scene      | The loop, views, cameras, lights, clocks, what exists and where, queries                  | Renderer internals  |
| Renderer   | Passes, pipelines, draw records, culling, shadows, atmosphere, shaders, the shader linker | Content's internals |
| GPU        | Device, limits, errors, timers                                                            | Renderer            |

**What to do when.**

- **At the big file split (before 5b), at no cost to WebGPU (done 2026-11-08):** split `Engine.ts` and `World.ts` along these lines instead of by size alone, so the loop and scene bookkeeping separate from the passes. These are pure moves, as already planned.
- **After that split, when it's cheap:** give `src/streaming` and `src/globe` a narrow interface for adding, updating and removing draws, in place of importing `World` and `render/layout`. Add the layers to `test/importBoundary.test.ts`, so content can't import GPU types. That test already assigns layers by file rather than by folder.
- **Done 2026-11-09, the second pass (`docs/superpowers/plans/2026-11-09-split-second-pass.md`):** published types no longer carry `@internal` members. A class's shared state lives in objects made once in its constructor: `WorldRaster` and `WorldScene`, `EngineRaster` and `EngineScene`, `TilesetState`, `ViewerState`, `ViewAnchorState`. Moved functions take narrow contexts over them, whose `raster` and `scene` keys say the side. `src/streaming` and `src/globe` use `DrawSink` and `TilesetHost`, and the import test enforces content, scene, renderer and GPU tiers. What's left, named in that test: `Tileset3D` and `Globe` still import `World` and `Engine` for public signatures (for 5i); `GlobeImagery` and `SlicePool` composite on the GPU from content; `Environment` in `src/gpu` loads a kernel; the renderer imports `Globe` for picks and `cityLight` for its data. `draws.ts`, `meshes.ts` and `materials.ts` cross the sides, and their contexts show how much: they're the next to separate when a second renderer is chosen.
- **For the post-processing design (§13.22), from what the pass left visible.** Passes aren't declared units yet: `buildViewFrame` registers them in order, and each body closes over a `ViewFrame`. A stage's inputs and outputs are not declared anywhere. What a stage API will need: its resources named per view, since targets live in `ViewFrame` and `OutputPassEngine` reaches for shared scratch (`presentData`, `adaptData`, `fxaaData`) on `EngineRaster`; readback queues a stage owns, since `meters`, `depthRanges` and `hdrReads` are engine-wide and drained in `render`; and a place for per-view state, as `View.autoExposure` and `View.pendingHdrReads` remain `@internal` on the view for the observer to take.
- **Not yet:** an abstract `Renderer` or backend interface. With one implementation it would be a guess, and it would pull WebGPU's design toward the lowest common case. Write it when a second renderer is actually chosen, using the spike to shape it.
- **Open for the API review (5i):** what to call the main entry point and "core" in the docs, and whether `GpuDevice` and `World` belong in the public surface. A host application that shares a device may need `GpuDevice`, so don't remove it without checking.

**Widgets: a subpath now, a package at release (2026-11-08).** `Viewer`, the inspector, the credits and the time controls are the `@cesium/next/widgets` entry point (`widgets/index.ts`). They import the other entries only by the package's name (`@cesium/next`, `/time`, `/frames`), so `test/importBoundary.test.ts` fails on any import from `widgets/` into `src/`, and splitting them out is a move of the folder and its `package.json` and `vite.lib.config.ts` entries, not an edit of their imports. `Emitter` became public for it (`Viewer.events` is one). The 1.x package `@cesium/widgets` already holds that name, so the separate package is called `@cesium/widgets` only when 2.0's packages get their final names. Two things keep the library lean. The package's `sideEffects` list is what lets an application build tree-shake the frames entry, so a module that must run on import has to be added to it. And the library build's frames entry is `scripts/libEntries/frames.ts`, not `src/frames/index.ts`: with the index itself as an entry, the widgets entry reached everything it re-exports, and a page that only created a Viewer loaded the IAU series and the DAF reader (`test/libraryWidgets.test.ts` pins that). The library build also writes `dist-lib/package.json` naming the folder `@cesium/next`, so the bare names in the widgets' declarations resolve for a consumer.

**Measure before choosing.** Share of target browsers without core WebGPU, from the handbook's compatibility tab; whether compatibility mode covers most of that share; and the Slang to GLSL ES spike on two kernels and one material.

**What the file split had to watch (from plan 5a's whole-branch review, 2026-11-08). The split is done; the first two points still apply to anyone changing these files, and the last is still to do.**

- Pass order is registration order. `FrameGraph` has no sort, and the 20 `addPass` calls are all in `buildViewFrame` (`src/render/view/viewFrame.ts`). Keep the registration sequence in one function; the bodies are in `scenePasses.ts`, `translucentPasses.ts` and `outputPasses.ts`.
- 98 test files use `as unknown as`, many to reach privates (`recordsU32`, `drawBatches`, `viewFrames`, `cascades`, `ready`, `loading`). A moved field fails at run time, or reads `undefined` in a comparison and turns an assertion vacuous. Change the tests in the same commit.
- `Engine.ts` had 20 module-level scratch values, and `selectionViews` and `selectionCasters` shared one array, safe only because of the order they ran in. Each moved function now has its own.
- `Globe extends Tileset3D`, with 23 `this.source` branches in the base. The base's constructor builds `itemHost` and a `SceneItem` for a globe. Keep that order.
- `Tileset3D.update` depends on order: casters follow view selection, and `receivers` reads other tilesets' `lastSelected`.
- A helper importing back from `World` or `Tileset3D` could leave `class Globe extends Tileset3D` evaluated too early. `test/importCycles.test.ts` now checks that.
- Names that pin files or methods: the seams allowlist (`bindSlab` in `src/render/world/tables.ts`, `drawOverlays` in `src/render/view/outputPasses.ts`), source pins in `test/shadowCasters.test.ts` and `test/terrainTranslucency.test.ts`, `handbook/src/pipeline.ts`, and the counts in this section. A seam detector that matches `records` names stops seeing a helper that renames them.
- `sideEffects` lists no `src/` module, so a split-out module that must run on import gets tree-shaken. Run `scripts/checkBundle.mjs` and `test/libraryWidgets.test.ts` after each move.
- Don't fix while moving. `setDrawShader` and `setDrawMaterial` duplicate the batch-move logic; merge them in a separate commit.
