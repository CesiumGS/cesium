# File split, second pass: real layers

Pure moves only: no behaviour, public API (`api/surface.txt`), shader or pass-order change. Pixels identical to main. Plan §13.17 and §13.32 are the frame for this; the renderer interface itself is not built.

## The shape

**State objects, built once in the constructor; the class passes itself.** Each class gets one `@internal` door per side, and each group of moved functions takes a narrow interface that `World` or `Engine` satisfies as is:

```ts
/** Rasterizer side: culling and bundles. Reads the scene's transforms. */
export interface BundleWorld {
  readonly raster: Pick<WorldRaster, "batchList" | "drawCount" | …>;
  readonly scene: Pick<WorldScene, "transformWorld" | …>;
  readonly ctx: RenderContext;
}
```

The keys say the side: a context with only `scene` is scene data, and one with both shows a crossing on its face. No object per tick: `world.raster` is one object, made in the field initializer. A function needing what another group needs has that group's context as a part of its own.

| State | File | Side | Holds |
| --- | --- | --- | --- |
| `WorldRaster` | `src/render/world/worldRaster.ts` | Rasterizer | Records, batches, bundles, cull, draw arguments, GPU tables and their rows, point draws, texture sets' bind groups, upload queue |
| `WorldScene` | `src/scene/world/worldScene.ts` | Scene | Transform tree, anchors, revisions, material keys and counts, placements, mesh ranges, feature tables, names, clip block allocation |
| `EngineRaster` | `src/render/view/engineRaster.ts` | Rasterizer | Staging buffers, view frames, picks, meters, lists, probes, samplers, pool, timer, sky, per-tick pass descriptors |
| `EngineScene` | `src/scene/engineScene.ts` | Scene | View ids and motion, cameras ahead, anchor eyes, tick timing, selection scratch, upload budget |
| `TilesetState` | `src/streaming/tilesetState.ts` | Content | What the moved streaming functions read and write |
| `ViewerState` | `widgets/viewerState.ts` | Widgets | What the moved viewer functions read and write |

`View`'s 12 stay for last; they're few and shared by Engine's own loop.

**Stays `@internal`, because it's genuinely shared:** `ctx`, `raster`, `scene`, `state`, and the methods streaming, the globe and `SceneItem` call on a world (`drawMaterial`, `setDrawMaterial`, `materialWithFlags`, `setTerrainClip`, `setGround`, `itemRemoved` and the like), and on an engine (`adoptTileset`, `bodyCamera`, `reportFarAnchors`).

**Contexts (one per group of functions; members generated from what those functions read, plus the contexts of what they call).** A file with a hub function, one that calls into many others, gets more than one, or everything in it would be as wide as the hub:

- `src/render/world`: `BundleWorld`, `CullWorld`, `PrepareWorld` (`bundles.ts`); `TableWorld`, `SlabBindWorld`, `ReserveWorld` (`tables.ts`).
- `src/scene/world`: `DrawWorld`, `AddDrawWorld`; `TransformWorld`, `ResolveWorld`, `AnchorWorld`; `MaterialWorld`, `TextureSetWorld`; `PlacementWorld`, `FeatureTableWorld`, `MeshWorld`, `ClipWorld`, `RayWorld`, `CastWorld`, `PointWorld`, `UploadWorld`.
- `src/render/view`: `RenderTickEngine`, `TickTargetEngine`, `ViewFrameEngine`, `ViewBlockEngine`, `ShadowBlockEngine`, `ScenePassEngine`, `TranslucentPassEngine`, `OutputPassEngine`, `PickEngine`, `EnvironmentEngine`, `TranslucencyEngine`, `ExposureEngine`.
- `src/scene`: `SelectionEngine`, `ContentEngine`, `HeightCaptureEngine`, `LightSourceEngine`.
- Content: per file of `src/streaming/tileset*.ts`. Widgets: per file of `widgets/viewer*.ts`.

Their member lists are in the code; each says its side in its first line. Functions that pass the whole class on to public API keep taking it: `addGlobeSource`, `addTileset`, `loadTileset`, `addTerrain`, `addEllipsoid`, `frameOf`.

**The content layer's seam (goal 3):** `DrawSink` and `TilesetHost` in `src/streaming/DrawSink.ts`, owned by content and satisfied by `World` and `Engine` as they are. `SliceWorld` and `GlobeImageryWorld` do the same for imagery, as their one method takes a GPU type. Constants in `render/layout.ts` that content needs move to `src/scene/contentLimits.ts`, and `layout.ts` exports them again. A tile's cost in draw rows comes through `DrawSink.drawOverheadBytes`, since it's derived from the generated layouts.

## Batches

Every commit: both tsc configs, and the tests it changed. Each batch ends with one full `npm test`. Check boxes as commits land.

- [x] **1. Published types.** `stripInternal` in both library configs; `test/internalMembers.test.ts`. Tests: that file, `build:lib`, `libraryWidgets`.
- [x] **2. World's state.** `WorldRaster`, `WorldScene`; class and free functions go through them; tests' casts become `world.raster.x`, typed, so a missing name is a compile error. Seam detectors widened and proved by a planted write. Tests: `seams`, `importCycles`, `sceneItems`, the terrain and bundle tests. Full suite.
- [x] **3. Engine's state.** `EngineRaster`, `EngineScene`, likewise. Tests: `anchorEyes`, `rerooting`, `shadowCasters`, `meterEmission`, `translucencyGating`. Full suite.
- [x] **4. Narrow contexts for World and Engine.** Function parameters become the contexts above. Tests: type checks; full suite once.
- [x] **5. Tileset and Viewer.** `TilesetState`, `ViewerState`, their contexts. `Globe`'s construction order checked: the state is the first field initializer, so it exists before `Tileset3D`'s own and before `Globe`'s. Tests: `casterBudget`, `casterLoop`, `tilesetEviction`, `sceneItems`, viewer tests. Full suite.
- [x] **6. Real layers.** `DrawSink`, `TilesetHost`, constants; `test/importBoundary.test.ts` gets content, scene, renderer and GPU layers, with named exceptions that fail when stale. Full suite.
- [ ] **7. End.** Stale pointers; note for post-processing; `translucency`, `customShader`, `parity`, `alloc`, `imagery` (bench, against main), `checkBundle`, `libraryWidgets`, `surface`, `shaders:check`, eslint, prettier, Snyk.

## Calls, and what undoing costs

1. **Real state objects, not a cast.** The cheaper option was keeping fields on the class as `private` and handing out `this as unknown as Context`: no test churn, but unchecked, and scene and rasterizer data would stay mixed in one object. State objects are checked by the compiler and keep the sides physically apart, as §13.32 asks. Undo: mechanical, but touches every moved function.
2. **Fields a constructor assigns lose `readonly`** in the state classes (`x!: T`), because the constructor stays on `World` and `Engine` in its order. Moving construction into the state classes would risk order. Undo: move those lines later, one at a time.
3. **Contexts per group of functions, not per function or file.** Per file, a hub such as `prepareFrame` made its neighbours as wide as itself; per function would be noise. Undo: merge or split one by editing its list.
4. **Tests go through `world.raster.x`** instead of a cast to a shape. That is stronger: the compiler now checks the name. Undo: not needed.
5. **`draws.ts`, `meshes.ts` and the like stay in `src/scene/world`,** even where a context shows they're mostly rasterizer. The context is the record of it; moving files is a later choice. Undo: a file move.
6. **Public signatures stay.** `Tileset3D.world`, `Tileset3D.addItem`, `Globe.load`'s parameters name `World` and `Engine` in public API, so those imports stay and are named exceptions in the boundary test, for the API review (5i).
7. **`GlobeImagery.ts` and `SlicePool.ts` keep their raw GPU calls** and their `RenderContext`, as named exceptions. They composite imagery on the GPU, so they're really rasterizer code living in content; moving them is its own task.
