# The worker-mode façade: design plan

**Status (2026-11-13):** reviewed and merged (answers in section 8). Its milestones are in `CESIUM2_WEBGPU_PLAN.md` §6, M13, sequenced with the public API review (Plan 5i). Nothing is built. Its milestones are named WF-1 to WF-12 (with WF-2a to WF-2d) so `CESIUM2_WEBGPU_PLAN.md` §6 can list them.

**Goal:** one app-facing API, called on the main thread, whose layer underneath runs the engine either on the main thread, synchronously, or in a dedicated worker on a transferred `OffscreenCanvas`. A probe picks the thread (`thread: "auto" | "main" | "worker"`). The same app code runs in both modes, and the API tests run in both modes to keep it so.

**Sources:**

- `CESIUM2_WEBGPU_PLAN.md` §13.41, "Architecture decisions from the 2026-11-13 discussion": threading (one API, the engine on either thread), jobs, shared memory detected and never required.
- `CESIUM2_WEBGPU_PLAN.md` §13.43, the job system: "Spike: the whole engine in a worker", "What the app-facing API would need", "One API, two backends", "Choosing the thread", the support facts, build against adopt (Comlink), "Owner's decisions after review" (app jobs, the inspector's Jobs section) and JP-1 to JP-9. Code: `src/io/Jobs.ts`, `src/io/WorkerPool.ts`, `src/io/sharedMemory.ts`.
- The spike on branch `spike/offscreen-worker` (commit e8d7fbe435, not merged): `spikes/workerLatency.ts`, `workerLatencyEngine.ts`, `workerLatencyScene.ts`.
- `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its "Worker mode" section and R2, R3, R7.
- `docs/superpowers/plans/2026-11-13-engine-profiles.md`, "How the worker mode slots in" and M9.
- `docs/superpowers/plans/2026-11-13-cesium-ir.md`: IR-6 to IR-9 (transforms, routes, styles, tables) and IR-13 (a program is the normative input wherever the engine takes a function; restricted JS as a front end).
- Code: `src/index.ts` and the entry points, `api/surface.txt`, `src/scene/Engine.ts` (`loop`, `onTick`, `onAfterTick`, `wake`), `src/scene/renderTarget.ts` (`CanvasTarget`, which already accepts an `OffscreenCanvas`), `src/gpu/GpuDevice.ts` (device loss), `widgets/` (`inspectable.ts`, `engine.ts`'s `engineSnapshot`, `recorder.ts`).

## 0. Decisions in force

From §13.41 and §13.43 (owner, 2026-11-13). This plan designs them; it doesn't reopen them.

1. The app always calls the same API on the main thread. Threading is an implementation detail under it.
2. Commands are ordered messages, batched, that need no reply.
3. Reads of engine state come from a per-tick snapshot.
4. Queries (picks, heights, rays) return promises.
5. App code that must run inside the engine's tick registers as a worklet-style module, loaded by URL on the engine's thread.
6. The engine publishes per-tick screen positions for HTML overlays.
7. The main-thread mode offers no synchronous read the worker mode can't. The API tests run in both modes to enforce it.
8. The mode comes from a probe, not browser sniffing. The host can force it. The inspector shows the mode and why.
9. Shared memory is detected and never required. Without cross-origin isolation, data is transferred.
10. Worker mode becomes the default in Dyno only after a headed run on an otherwise idle GPU shows smoother ticks.
11. `GpuDevice`, `Capabilities` and `LimitsTier` move to an advanced entry point (`@cesium/next/gpu`). A device can't cross threads.
12. No new dependency without the owner's agreement.

## 1. Inventory of the public API

Read on 2026-11-13 from `api/surface.txt` (856 names), the entry points and `widgets/`. Members of engine types were listed with the TypeScript checker and classified by hand. The full table (one row per name and per member, with its file and line) is a working file and isn't committed. WF-1 turns it into the protocol table. Paths below are under `packages/next/src/` unless they start with `widgets/`.

### Exported names by entry point

- **type:** an interface or type alias.
- **local:** pure functions, constants and value classes with no engine state (maths, the frames, time and projection computations, builders of plain data). These run on the page in both modes and need nothing from this plan.
- **engine:** touches engine state.

| Entry | type | local | engine | Total |
| --- | ---: | ---: | ---: | ---: |
| core (`.`) | 276 | 176 | 66 | 518 |
| `frames` | 66 | 55 | 5 | 126 |
| `measure` | 20 | 13 | 1 | 34 |
| `proj` | 68 | 41 | 5 | 114 |
| `time` | 5 | 18 | 0 | 23 |
| `widgets` | 30 | 2 | 9 | 41 |
| **All** | **465** | **305** | **86** | **856** |

50 of the types carry a callback, a DOM type, a GPU object or an `AbortSignal`, so they matter where they appear as arguments. Several option types hold engine objects by reference: `TilesetOptions.customShader`, `style`, `placement` and `anchor` (`streaming/tilesetTypes.ts:101-149`), `GlobeOptions.imagery` and `lights` (`scene/Engine.ts:275-283`), and `ViewOptions.target`, `world` and `camera` (`scene/View.ts:103-105`). On the wire they become handle ids.

### Members of the engine types, by kind

The 86 engine names have 1,062 public members across 82 owners.

| Kind | Members | What it becomes |
| --- | ---: | --- |
| Snapshot read | 391 | a mirrored value (what the app wrote) or a snapshot field (what the engine computed) |
| Command | 265 | an ordered message, no reply |
| Handle-returning command | 30 | a page-named handle; 17 of them also get a slot or capacity result from the engine, later, as a handle event |
| Query | 36 | a promise (most are already async) |
| Event after the tick | 15 | delivered on the page after the snapshot (already this shape) |
| **Sync read that can't be a snapshot** | 77 | about 25 are handle lookups the page's mirror answers; about 25 evaluate arbitrary arguments against engine state (section 2.2); the rest are internals |
| **In-place mutation** | 60 | a setter that sends a command |
| **Callback inside the tick** | 56 | a Cesium IR program, a module, or page-side code (section 2.1) |
| **DOM-bound** | 29 | stays on the page (section 2.3) |
| **Can't cross as it stands** | 103 | moves to an advanced, main-thread-only entry, or becomes a module (below) |

**The five hard kinds total 325 members.** 189 are app-facing; 136 are engine internals the package exports today (31 on `World` alone: GPU buffers, render bundles, encoders, `raster`, `scene`, `warps`; `Tile` graph links; `ChainIo`). App-facing: 70 sync reads, 48 in-tick callbacks, 32 in-place mutations, 28 DOM-bound, 11 that can't cross. §13.43's audit counted 110–130 on the core types; it missed the controllers (14 hard members, 9 DOM-bound), `CanvasTarget` (7), `Viewer` (12), the interfaces the engine calls (`QueryHost`, `FrameResolver`, `SceneClock`), the live warp parameters written in place, and the 28 tuning fields on `tileset.selection`.

### The hard cases by name

**Callbacks inside the tick:**

- `Engine.onTick` (`scene/Engine.ts:1572`, the only one returning keep-awake).
- `World.addFrameCompute` (`scene/World.ts:2082`), `World.addOccluder` (`:1138`), `World.acceleration` hooks (`:271`).
- `View.renderRoot` (`scene/View.ts:308`).
- `CameraLayer.setResolver` (`camera/CameraLayer.ts:143`) and `setClock` (`:180`; a `SceneClock` read every tick).
- `FrameResolver.resolve`, `route`, `motion` (`camera/frameResolver.ts:77, 93, 111`), and `Frame`'s `toParent` closures (`frames/Frame.ts:79-156`), which `createFramesResolver` runs every tick.
- `Warp.forward` and `inverse` (`camera/route.ts:118, 128`), `LiveEdge` (`transforms/liveEdge.ts:37, 89`).
- `Tileset3D.debugTileColor` (`streaming/Tileset3D.ts:451`).
- `PostStage.perView` (`scene/postStage.ts:402`).
- `GlobeController.surfaceHeight` (`scene/GlobeController.ts:83`) and `update()` (`:875`).
- `SpatialQueries.standing`'s query closure (`query/queries.ts:242`), `QueryHost` (`:260-273`), `RayBackend.answer` (`:254`).
- `ImageryProvider.tileUrl` and `tileCredits` (`globe/ImageryProvider.ts:16, 24`).
- `MeshCaps.onChange`, `BrepCaps.onChange` (`scene/world/caps.ts:790, 432`).
- `TerrainRayTarget.patchAt` (`globe/terrainRay.ts:90`), `DistanceField.distance` (`geometry/sdf.ts:25`), `Occluder` (`streaming/occluders.ts:33, 38`).

**Sync reads that evaluate arbitrary arguments:**

- `View.toPixel` (`scene/View.ts:977`), `anchorRoute` (`:874`), `anchorPlacement` (`:757`), `anchorCamera` (`:889`).
- `Tileset3D.sampleHeight`, `exactHeight`, `surfaceHeight` (`streaming/Tileset3D.ts:881-895`), `terrainClipped` (`:337`), `terrainRayTarget` (`:905`); `Globe.stoppingTerrainHit` (`globe/Globe.ts:512`).
- `World.feature` (`scene/World.ts:1869`), `worldMatrix`, `localMatrix`, `drawMatrix`, `anchorMatrix` (`:1224-1360`), `translucentRange` (`:2124`).
- `Engine.clipFilter` (`scene/Engine.ts:1266`), `bodyCamera` (`:1227`); `ClipFilter.keeps` (`geometry/query.ts:41`); `Georeference.displayed`, `designOf`, `displayError` (`georeference/georeference.ts:27-47`); `FrameResolver.accuracy` (`camera/frameResolver.ts:126`); `ModelPlacement.geometry` (`scene/gltfModel.ts:1081`).

**In-place mutations:**

- `Camera.position`, `direction`, `up`, `right`, with `lookAt`, `orient`, `copyFrom`, `rotateAroundCenter` changing them and `version` polled by apps (`scene/Camera.ts:22-172`).
- `View.camera` (`scene/View.ts:258`), `viewport` (`:426`), `observer` (`:440`), `lighting` (`:517`), `overlays` (`:657`), `occlusionState` (`:670`).
- `Engine.sunDirection`, `icrfToFixed`, `moonPosition`, `moonAxes` (`scene/Engine.ts:615-635`).
- `Tileset3D.selection` (`streaming/Tileset3D.ts:150`, 28 fields).
- Live warp parameters written then `changed()`: `VerticalExaggeration.factor`, `HeightOffset.metres`, `BlendedWarp.t`, `ScaleAbout.factors`.
- `OrbitController.camera`, `Viewer.sky` (`widgets/Viewer.ts:312`).

**DOM-bound:** the controllers' `element`, `ignore` and `dispose`; `CanvasTarget` (canvas, `pixelRatio`, `width`, `height`, `watch`, `fixedPixelRatio`); `View.target`; `Engine.setMoonMap(ImageBitmap)`; `CustomShader.textures`; most of `Viewer` (canvas, controller, container, `setControls`, `suspendPresentation`).

**Can't cross as it stands:** `GpuDevice.device` and `adapter`, `Engine.gpu`, `Engine.ctx`; `Engine.addHeightCapture` (its `HeightCapture` holds a `GPUTexture`, a `GPUBuffer` and a `Float32Array` the engine fills each tick); `GraphStage.register` (a frame-graph callback given raw WebGPU objects); `TextureBinding`, `World.createTextureSet`, `setImageryArray`; `Tileset3D.root` and `lastSelected` and the `Tile` graph links.

### Who uses them

Counted over `examples/`, `demo/` and `lab/`:

- `toPixel`: 12 call sites in 10 files. Height samples: 9 in 8. `onAfterTick`: 8 in 7; `onTick`: 4 files. `Frame` and `smoothFrame` closures: 22 in 14. Camera vectors touched in 13 files, written in place in 2. `camera.version` polled in 3. A `GPUDevice` used directly in 2 (night-sky, translucency).
- The common pattern that breaks: an `onAfterTick` listener that calls `toPixel` or a height sample to place DOM. Tracked points (section 2.2) replace it.
- Most affected, in order: **vertical-exaggeration** (`toPixel` in `onAfterTick` in `main.ts`, `ruler.ts`, `pins.ts`; `globe.surfaceHeight`; `anchorRoute`; the resolver's `bindAnchor`), **design-globe** (scene-moving `onTick`; `toPixel` in four files; `camera.version` polling), **transform-graph** (`fromFunction` with an `inverse` closure; `Frame` with `toParent` in three scenes; camera vectors written in place), **frames-explorer** (`sunDirection.set`; `surfaceHeight` in two files; `Frame` subclasses; `Object.assign(view.lighting, …)`), **clipping** (`toPixel`, `viewport`, `camera.fov` animated in place, `world.feature`), **night-sky** (a custom `GraphStage` with raw WebGPU, `icrfToFixed`, camera vectors in place), **translucency** (`engine.gpu.device.queue` and its own `renderFrame()` loop), **csg** (`camera.version`, `world.feature`), and `demo/main.ts`.
- Nothing in the examples uses `addFrameCompute`, `debugTileColor`, `queries.standing`, `addOccluder` or `queryRays`; only tests, the engine and spikes do. Those can change with little migration.

### Widgets

- **`Viewer`** (`widgets/Viewer.ts:289-1178`) owns the canvas, a `CanvasTarget`, a `GlobeController` and the DOM widgets. It runs the controller and clock in `onTick` (`:544`) and DOM in `onAfterTick` (`:553`); reads `surfaceHeight` through the controller (`:408`); writes `sunDirection`, `icrfToFixed`, `moonPosition` and `moonAxes` in place (`widgets/viewerSky.ts:25-31, 59`); and uses `anchorCamera`, `setCameraFromAnchor` and the camera layer's resolver and rig (`widgets/viewerCamera.ts:48-62`, `widgets/viewerFrames.ts:68-140`). It stays on the page and drives the façade.
- **The inspector** (`inspectEngine`, `engineSnapshot`, `widgets/engine.ts:68-540`): every read is a snapshot read, its `InspectorSnapshot` is plain data, and `attachInspector` only calls `Inspectable.snapshot()` and `ticks()`. It is already the message seam.
- **The recorder** reads `stats`, `occlusionStats` and `gpuSample` in `onAfterTick`, and checks `view.target.canvas` against `HTMLCanvasElement` (development only).
- **The observer panel** polls `view.readout()` every 200 ms (`widgets/observerPanel.ts:497, 668, 798`) and edits `view.observer` and its stages in place (`:201, 787`): a setter and a snapshot field.
- **Time controls** and **credits** are DOM over page-local state; `orbitFocus`'s `planOrbit` is pure, and `followZoom` issues camera commands. **`sseProbe`** (development) reads engine internals and won't survive the façade as written.

### Already in place

- `CanvasTarget` accepts an `OffscreenCanvas` (`scene/renderTarget.ts:46`).
- `spikes/engine-worker.ts` (M0) runs `Engine`, `createWorld`, `addMesh` and `addDraw` unchanged in a worker.
- `fromFunction` (`transforms/fromFunction.ts`) already parses a function's source, never evaluating it, into the IR, refusing free variables with the construct named. Today a refused function is kept as a CPU closure; section 2.1 changes only that fallback.
- The built-in smooth edges are declarative data.

## 2. The hard cases

### 2.1 User JavaScript the engine calls inside the tick

Today the engine calls app functions during its tick: tick listeners (`onTick`, which may change the scene and returns "busy"), warp `forward` and `inverse` closures, smooth edges from a function (`smooth`, `fromFunction`), frame resolvers and `toParent`, `addFrameCompute`, standing queries' closures, `debugTileColor`, and the controllers' handlers. A closure can't cross a thread: `postMessage` can't clone a function, and a function's captured variables live in the page's heap.

There are three ways for such code to run in the worker, and the plan uses each where it fits:

| Form | What crosses | Runs on | Fits |
| --- | --- | --- | --- |
| **A Cesium IR program** | the program as JSON (`cesium-ir/<major>.<minor>`) | the worker's CPU evaluator, and the GPU through the WGSL and GLSL ES emitters | pure functions: warps, smooth edges, styles, shader hooks, frame functions with no side effects |
| **A module by URL** (worklet style) | a URL, and parameters as plain data | the engine's thread, as JS | code with state or effects that must run in the tick: tick modules, controllers, resolvers that read engine state |
| **Page-side code over commands** | commands out, the snapshot in | the main thread | code that can run a tick later: most tick listeners, custom camera controllers, UI-driven animation |

**Functions become programs (with the Cesium IR plan).** IR-13 makes a program the normative input wherever the engine takes a function, and lists restricted JS as a front end. `fromFunction` already does the first half of this: it parses a function's source into the IR and never evaluates it, but keeps a function it can't parse as a CPU closure. The façade generalises the rule: **a self-contained JS function is accepted by its source text** wherever a function is taken. The façade reads `fn.toString()` and lowers it through the restricted-JS front end, and a function that can't be lowered is refused rather than kept as a closure. If the function refers to a free variable (anything captured from outside, including helpers a transpiler injected), lowering fails with a diagnostic that names the variable and suggests passing it as a parameter. So `smooth((p) => [p[0] * 2, p[1], p[2]])` works in both modes; a function that closes over `scale` must take `scale` as a parameter, which then becomes a uniform (IR-8's literals-to-uniforms rule). Nothing is evaluated with `eval` or `new Function`, so a CSP without `'unsafe-eval'` is fine.

- A program runs everywhere a closure ran, and more: on the GPU, with autodiff and interval bounds. The warp fits that today stay on the main thread for closures (JP-5: "a main-thread slice otherwise (closures)") move to jobs.
- Until IR-13 and its JS front end land, the module form is the bridge: a warp written as JS is a module exporting `forward` and `inverse`, loaded by URL. It runs on the CPU in the engine's thread, as closures do today.

**Closures are refused in both modes** (question Q1). Accepting a closure in main-thread mode and refusing it in worker mode would let an app work in one mode and fail in the other, which breaks decision 7. So every public parameter that takes a function takes a program, a self-contained function (lowered by source), or a module reference, in both modes. The diagnostic says which form to use.

**Tick listeners.** `engine.onTick(listener)` stays, with one documented difference in when its effects render:

- In main-thread mode it runs inside the engine's tick, as today, and what it changes renders in that tick.
- In worker mode it runs on the page in the page's `requestAnimationFrame`. What it changes becomes commands, which the worker applies at the start of its next tick. Its return value ("busy") becomes a keep-awake command sent when it changes.
- In both modes, what it reads comes from the last snapshot (section 3.3), so it sees the same values in both.
- Code that must change the scene in the same tick it reads, with no tick of lag, registers a **tick module**: `engine.addTickModule(url, { params })`. The module exports `tick(ctx, now)`, which runs inside the engine's tick in either mode, with `ctx` giving the engine-side API, `ctx.params` (plain data the page sets by command) and `ctx.post(message)` back to the page. This follows AudioWorklet's shape (section 4).

`onAfterTick` listeners run on the page in both modes, after the snapshot of that tick has arrived. They place DOM against the canvas, which is what they are for.

**Custom camera controllers.**

- The built-in controllers run on the engine's side in worker mode, fed by forwarded input (section 2.3). They need synchronous picks and heights (zoom to the cursor, collision with terrain), which only the engine's side has.
- A custom controller runs on the page by default. It reads the camera from the snapshot and the pointer from DOM events, and writes the camera by command. Since input arrives on the page anyway (the spike: "the worker doesn't help input"), a page-side controller adds no hop that forwarding raw events wouldn't. It pays a round trip only for queries it awaits.
- A controller that needs synchronous engine reads per event is a controller module: `view.setController(moduleUrl, { params })`, with the module receiving the forwarded input events and the engine-side API.

**The rest of the in-tick callbacks, one by one:**

- Pure functions become programs: standing queries' closures, `debugTileColor` (a program over a tile's fields, or a built-in colouring), `DistanceField.distance`, `ClipFilter.keeps`.
- `Frame`'s `toParent` closures and `FrameResolver` implementations: the frames library's built-in frames are data already; a custom frame is a program when it's a pure function of time, and a module when it reads live catalogs (`createFramesResolver` over live data). The frames-explorer example already computes in its own worker, so its catalogs can move with the module.
- `SceneClock` (`CameraLayer.setClock`): the built-in `Clock` is data plus commands (play, pause, rate, time); a custom clock is a tick module.
- `ImageryProvider.tileUrl` and `tileCredits`: URL templates as data cover the built-in providers; a custom provider is a module.
- Stateful hooks become modules: `addFrameCompute`, `addOccluder`, `World.acceleration` hooks, `PostStage.perView`, `View.renderRoot`.
- `GraphStage.register` hands raw WebGPU objects to app code (the night-sky example's sprite stage). In worker mode that code must run in the worker: a stage module, loaded by URL, given the same GPU objects there. It is the one module kind that sees the device, so it lives in the advanced `@cesium/next/gpu` entry.
- `MeshCaps.onChange` and `BrepCaps.onChange` are change notifications: events after the tick.

### 2.2 Synchronous reads apps rely on

The rule: **reads of what the app wrote return what it wrote; reads of what the engine computed come from the snapshot.**

- **Mirrored reads.** The page keeps a mirror of app-authored state: the options the app set, the items it added, the camera pose it set. Reads of these are exact and current in both modes, with no staleness: `world.items`, a view's options, a tileset's settings.
- **Snapshot reads.** State the engine computes (the camera after a rig, link or controller moved it; stats; tileset counts; refinement; support reports; memory) is read from the last snapshot. It is one tick old in main-thread mode and one tick plus a message hop old in worker mode. Each read value's tick is available (`snapshot.tick`).
- **Reconciling the two.** When the app sets the camera and the engine also moves it, the snapshot carries `appliedSeq`, the last command the engine had applied when it took the snapshot. A mirrored value the app wrote is shown until a snapshot with `appliedSeq` at or past that write arrives; from then on the snapshot's value wins. This is the usual optimistic-update rule, and the same in both modes.
- **Reads with arbitrary arguments** can't be snapshots, and each gets one of three treatments:
  1. **Computed on the page from the snapshot.** `view.toPixel(point)` and `fromPixel` are pure maths over the camera, the viewport and the render space, all in the snapshot. On the page they match the last presented image, which is what an overlay needs. Points under a warp need the warp's map, so they use tracked points (next item).
  2. **Tracked points.** `view.track(point, { height, pixel, visible })` registers a point whose screen position, clamped height and visibility the engine publishes in every snapshot. This is decision 6's overlay publication, generalised: HTML pins, readouts and labels read `tracked.pixel` and `tracked.height` synchronously in both modes.
  3. **Promises.** `sampleHeight` and `surfaceHeight` become `heightAt(position, options)`, a query. `feature(id)` becomes a query. `Clamp.height` becomes a tracked point or a query. The already-async ones (`pick`, `pickPosition`, `castRays`, `queryRays`, `sampleHeightMostDetailed`, `readHdr`, `whenSettled`, `converged`) stay as they are.
- **Handle lookups** (`World.featureIdOf`, `hasDraw`, `transformAlive`, `Tileset3D.tileOfDraw`, `SceneItem.drawsOf`, about 25 in all) are answered by the page's mirror where the app made the handles, and by a snapshot section where the engine did (tiles' draws).
- **Matrices and anchors** (`worldMatrix`, `drawMatrix`, `anchorMatrix`, `anchorRoute`, `anchorPlacement`, `anchorCamera`, `bodyCamera`): the ones the app asks for every tick become tracked items, published per snapshot like tracked points; the rest become queries.
- **`HeightCapture`** holds GPU objects and a CPU array the engine fills each tick. Its CPU array becomes a snapshot section (a height grid, sent when it changes); its GPU texture stays engine-side, for clamping.
- **Picks.** They are already promises. In worker mode they answer faster than on the page (the spike: 1.3–1.7 ms p50 against 4.2–14 ms), because a page pick waits for the page's next tick.

### 2.3 DOM-bound pieces

- **The canvas.** The page keeps the `HTMLCanvasElement` for layout, focus and input. In worker mode the façade calls `transferControlToOffscreen()` when the view is added and posts the `OffscreenCanvas` to the worker, which wraps it in a `CanvasTarget` (it already accepts one). The transfer can't be undone, so it happens only after the probe passed.
- **Resize and pixel ratio.** A `ResizeObserver` on the page, with `devicePixelContentBoxSize` where available (else the CSS box times `devicePixelRatio`), and a `matchMedia` watch on the pixel ratio. Each change sends `resize(view, width, height, pixelRatio)`. The worker sets the `OffscreenCanvas`'s `width` and `height`, which `CanvasTarget` already watches. The spike sized the canvas at one CSS pixel per device pixel; the façade must use device pixels.
- **Input.** The page listens on the canvas (pointer, wheel, keys, context menu, touch, focus and blur) and forwards each event as plain data: type, position in CSS and device pixels, buttons, modifiers, pointer id and type, wheel deltas and mode, `timeStamp`. Moves are coalesced per page task, keeping the last position and the coalesced points (`getCoalescedEvents`). Pointer capture stays on the page. `preventDefault` must be decided synchronously on the page, so it follows a page-side policy set by the controller's configuration (for example, wheel over the canvas is prevented while a camera controller is on), never a question to the worker. This is the shape three.js's OffscreenCanvas guide uses (section 4).
- **Texture sources.** An `HTMLImageElement`, `HTMLCanvasElement` or `HTMLVideoElement` passed as a texture becomes an `ImageBitmap` (`createImageBitmap`) or, for video, a `VideoFrame`, transferred. Both modes do this, so a texture from a canvas behaves the same.
- **HTML overlays.** `View.overlays` and DOM labels are placed from tracked points in `onAfterTick`. In worker mode they trail the canvas: the spike measured about two ticks at p90 (32–34 ms) with a busy page, and up to seven. Labels drawn in the engine have no lag. An app that needs overlays and canvas in the same presented frame either uses in-engine labels or forces main-thread mode (question Q6 has a third option).
- **Widgets.** They stay on the page in both modes and read the façade: mirrored state, the snapshot and events. They import only the public entry points already (`test/importBoundary.test.ts`), so their changes are the same reads every app makes.
- **The inspector.** `Inspectable` (`widgets/inspectable.ts`) already has the right shape: `snapshot()` and `ticks(listener)`. In worker mode the inspector asks for its snapshot section by command while it is open; the worker adds it to the per-tick snapshot only then. The tick and GPU events come from the same messages.
- **The recorder.** Rows are plain data already (`recorderRows.ts`). They are built on the engine's side, where every value is current, and sent in batches (each second, and on stop). The CSV is assembled on the page.
- **Main-thread-only hosts.** WebXR (sessions belong to the page) and hosts that share a WebGPU device with the engine (the `@cesium/next/gpu` entry) need main-thread mode. The probe's answer is overridden by the host's `thread: "main"`, and the inspector says why.

## 3. The mechanism

### 3.1 Layers

```text
app code (main thread)
  │  the public API: Engine, View, World, Camera, tilesets…  (the façade)
  │    mirrored state · snapshot store · command encoder · query table
  ▼
transport: direct (main-thread mode) | channel (tests) | worker
  ▼
host (the engine's thread): command decoder · snapshot builder · query runner · module loader
  ▼
the engine (today's classes, renamed internal; not exported from the main entry)
```

- **The façade** is the public API. Public names don't change (`Engine`, `View`, `World`, `Camera`, `Tileset3D`…); the classes behind them do. Today's classes become the internal engine, run by the host in either thread.
- **Three transports, one protocol:**
  - `direct`: main-thread mode. The host runs on the page. Commands are applied as they are issued (no batching, no copies), and the snapshot store points at the host's pooled snapshot. This keeps main-thread mode as fast as today, less one function call per command.
  - `channel`: tests. The host runs on the same thread behind a `MessageChannel`. Every message is structured-cloned and delivered asynchronously, as in worker mode. Node has `MessageChannel`, so this runs under vitest with `test/fakeGpu.ts`.
  - `worker`: the host runs in the engine's dedicated worker.
- **One protocol table** (`src/thread/protocol.ts`) lists every public member with its kind (section 1), its opcode, its argument schema and what it transfers. The encoder, the decoder, the TypeScript types of the façade and the parity test all read it. A member missing from it fails a test that compares it with `api/surface.txt`, so a new API can't skip the classification.

### 3.2 Commands: batching and ordering

- **Encoding.** A command is a compact array, `[opcode, target, ...args]`, where `target` is a handle id. Arguments are structured-clone data. Large arrays go in the message's transfer list (section 3.5).
- **Handles named by the page.** Calls that create something (`createWorld`, `addView`, `world.add`, `addMesh`, `addMaterial`, `loadTileset`, `addClip`, `addLight`, `addAnchor`…) return a façade object at once, with an id the page chose. The command carries the id, so it needs no reply. What only the engine knows (a slot, a deduplicated material, a capacity failure) arrives later as a handle event: `handle.status` moves from `"pending"` to `"ready"` or `"failed"`, and `handle.ready` is a promise.
- **Batching.** Commands issued in one page task go out as one message, flushed in a microtask (`queueMicrotask`). The page's `requestAnimationFrame` callback flushes at its end too. One batch per task keeps latency low; batching per tick would add up to a tick to every command. (§13.41 says commands are batched per tick. They still are where it matters: the worker applies them once per tick. Sending them per page task only saves the wait for the page's next tick.)
- **Coalescing.** Consecutive sets of the same property on the same handle within a batch collapse to the last one (camera moves from a drag). Nothing else is reordered or merged.
- **Ordering.** One ordered stream carries commands, queries and cancellations, so a query sees every command issued before it. The host applies every batch that has arrived at the start of its tick, before tick modules run. A batch that arrives while the engine sleeps wakes it (`wake("command")`, the refinement plan's attributed wake). A batch that arrives mid-tick waits for the next tick.
- **Sequence numbers.** Each batch has a `seq`. The snapshot reports `appliedSeq` (section 2.2).

### 3.3 The per-tick snapshot

The host builds one snapshot at the end of every tick that changed something, after rendering, and posts it. Sections carry a revision and are sent only when they changed.

| Section | Contents | Sent | Size |
| --- | --- | --- | --- |
| header | `tick`, `frame` (rendered frames so far), `timeMs`, `appliedSeq`, loop state (`stats.loop`) | every snapshot | under 100 B |
| cameras | per view: position, direction, up, right, the view and projection matrices, frustum parameters, viewport, render-space origin; per body camera the same | when a camera moved | about 450 B per view, as float64 |
| tracked points | per tracked point: pixel x and y, depth, visibility, height | when any moved | 20 B per point, as float32 |
| stats | `FrameStats` (CPU and GPU time, triangles, geometry counts, jobs) | each rendered tick | about 1 KB |
| tilesets and sources | per tileset: idle, active, morphing, counts, credits revision | when changed | about 100 B each |
| refinement | per view: the refinement summary (refinement plan, section 5) | when a level, kind set or count changed | a few hundred B |
| support | per view: `SupportReport`, `EffectiveSettings`, notices (profiles plan) | when changed (rarely) | a few KB |
| handle events | slots assigned, ready, failed, with errors | when any | small |
| events | tileset events, `onHeightsChanged`, engine-made camera changes (`Camera.watch`) | when any | small |
| inspector | the `InspectorSnapshot` and tick and GPU events | only while the inspector is open | tens of KB |
| recorder | rows since the last batch | each second while recording | depends on columns |

- **Budget:** at most 8 KB per snapshot in steady state without the inspector, recorder or tracked points, and at most 64 KB with them. These are targets to measure in WF-11, not measurements. The cameras and tracked points go as one `Float64Array` and one `Float32Array`, transferred; the rest as plain objects.
- **The page side.** The snapshot store keeps the last snapshot, swaps it in at once on arrival, then runs `onAfterTick` listeners and events. `onRefinement` and the profiles plan's reads are driven by the same arrival.
- **Main-thread mode.** The store points at the host's pooled snapshot, rebuilt at the end of each tick. Nothing is copied.

### 3.4 Queries

- **Ids.** A query is `[QUERY, id, op, args]` in the ordered stream; the reply is `{ id, ok, value }` or `{ id, ok: false, error }`. The page holds a table from id to the promise's resolvers.
- **When they run.** Between ticks, as messages arrive, unless the query needs a rendered tick (a pick of what is drawn, `converged`), in which case it runs at that tick's end. The spike's picks already worked this way.
- **Cancellation.** A query takes an `AbortSignal`. Aborting rejects the promise on the page at once with the signal's reason and sends `[CANCEL, id]`. The host aborts the query's internal signal, so its work stops (a ray batch, a height sample's tile loads), and drops a reply that was already on its way.
- **Timeouts** run on the engine's side where the engine defines them (`converged({ timeoutMs })`), so they count the engine's time, not the page's.
- **Comlink isn't used** (question Q4). §13.43 asked to evaluate it for the query round trips. Its proxies would run on a second channel, so a query could overtake the commands before it. Ids in the ordered stream are the part of Comlink we need, in about a hundred lines, with no dependency.

### 3.5 Transfer and shared memory

- **The mode** comes from `sharedMemory()` (`src/io/sharedMemory.ts`), on the page and in the worker. The inspector shows it with the job system's (`JobStats.memory`).
- **Without isolation (transfer).**
  - Large arguments are copied by default, so the app keeps its arrays in both modes. A call can opt in to transfer (`{ transfer: true }`); the array is then detached in both modes. In main-thread mode the façade detaches it too (`structuredClone(value, { transfer })`), so a use after transfer fails in both modes, not only in the worker.
  - The snapshot's numeric sections are transferred `Float64Array` and `Float32Array` buffers from a small pool that the page returns with its next batch.
- **With isolation (shared), WF-10:** the cameras and tracked points live in a `SharedArrayBuffer` double buffer with a sequence counter: the worker writes the back half and flips; the page reads the front half and checks the counter. That saves the copy and the allocation per tick, but not the hop: the page still reads when it runs. It is worth building only if WF-11 shows the transfer path costs a measurable share of a tick.
- **Content data** keeps its own path: decode workers and the job system (§13.43), with nested content workers inside the engine's worker. Nothing in the façade copies tile data.

### 3.6 The OffscreenCanvas, and loss

- **Transfer:** per view, when the view is added in worker mode. A canvas that already has a context can't be transferred; the façade throws a clear error before trying.
- **WebGPU device loss in the worker.** `GpuDevice` already replaces a lost device and emits `lost`. The host forwards it as an engine event (`engine.onDeviceLost`, with the reason and message), and the view keeps its `OffscreenCanvas`, reconfigured on the new device. Rebuilding worlds isn't done today in either mode (`Engine.create`'s comment: recovery "stops at the device"). The façade's mirror of app-authored state is what such a rebuild would replay, in both modes (question Q7).
- **Worker loss.** An uncaught error that kills the worker, `worker.onerror` at startup, `messageerror`, or a watchdog (no snapshot or reply for 5 s while the page expects one) mean the worker is gone, and its canvas with it: a transferred canvas can't be taken back. The façade then:
  1. rejects every pending query with `EngineLost`;
  2. emits `engine.onLost({ reason })` and sets `engine.state` to `"lost"`;
  3. on `engine.restart()`, replaces each view's `<canvas>` with a fresh one (same attributes, classes and styles), so a new engine can use it, in a new worker or on the main thread.
- **Background tabs.** A worker's `requestAnimationFrame` stops with its owner page's (MDN). The watchdog counts only while the page is visible.

### 3.7 Errors and exceptions

- **Two kinds, the same in both modes:**
  - **Argument errors** (a wrong type, a value out of range, a removed handle, an argument that can't be cloned, a closure where a program is required) throw synchronously on the page, from the façade's checks, before anything is sent.
  - **Engine errors** (a capacity exceeded, a shader that fails to compile, a GPU validation error, a load that fails) happen on the engine's side. They arrive as events: `engine.onError`, the handle's `status` and `error`, and the rejection of any query on that handle. In main-thread mode these are delivered the same way, after the call returns, rather than thrown from it (question Q5).
- **What crosses.** An error is serialized as `{ name, message, stack, code, handle, seq, opcode }` and rebuilt on the page as an `EngineError` with the same `name`, `message` and `code`.
- **Where it came from.** In development builds the façade keeps the page's call stack for the last 256 commands, keyed by `seq`, and attaches the page stack to the engine error, so an error points at the app's line, not only at the worker's.
- **Tick modules.** A module that throws is reported through `engine.onError` with its URL, and the tick goes on, as a tick listener's error does today (`reportLoopError`).

### 3.8 Choosing the thread: the probe and its fallback

As decided in §13.43 ("Choosing the thread"), with the parts the spike left open:

1. `Engine.create({ thread })` with `"auto"`, `"main"` or `"worker"`. Default `"auto"` (question Q8 on what `"auto"` resolves to until WF-11).
2. **Auto:**
   1. Read the cached answer for this user agent and build (`localStorage`, in a try/catch; the key includes the package version).
   2. Start the engine's module worker. If construction throws (a CSP without `worker-src` or `blob:`, no module workers), use the main thread.
   3. In the worker: `navigator.gpu`; `await requestAdapter()` not null; a `"webgpu"` context on a throwaway `OffscreenCanvas(1, 1)`; and `crossOriginIsolated` for the memory mode. A probe that doesn't answer within 10 s counts as failed.
   4. If it passes, that worker **becomes** the engine's worker: there is no second start. The adapter it requested is reused.
   5. If it fails, terminate the worker and run on the main thread. Same API.
   6. Cache the answer. If a cached "worker" fails later, before any canvas was transferred, fall back and probe again next time; after a transfer, it's worker loss (section 3.6).
3. **Forced `"worker"`** that can't run rejects `Engine.create` with the probe's reason (question Q3). **Forced `"main"`** never starts the engine's worker.
4. **What the app sees:** `engine.thread` (`"main"` or `"worker"`) and `engine.threadReason` (the probe's answer, or "forced by the host"). The inspector's header shows both, with the memory mode.
5. **The same app code in both modes** follows from the façade: every member behaves by its kind in either transport, with the documented differences limited to when effects render and how stale snapshot reads are.
6. The same probe gains `getContext("webgl2")` for the WebGL 2 renderer (`renderer: "auto"`, profiles plan).

### 3.9 Running every API test in both modes

- **The API suite** is the tests that use only the public entry points (imports from `src/index.ts` and the other entry points, nothing deeper). WF-4 moves or tags them (`test/api/`), and a lint rule keeps deeper imports out of that folder.
- **Two runs:** a vitest project per mode, `main` (direct transport) and `channel` (the worker protocol over a `MessageChannel` on the same thread, every message cloned, delivered asynchronously). `npm test` runs both.
- **Strict cloning** in the `channel` run catches what a real worker would refuse: functions, DOM objects, class instances whose prototype matters.
- **Staleness** is the same in both runs, since main-thread mode reads the snapshot too. A test that reads engine state waits for a tick (`await engine.nextTick()`) or a query, not a microtask.
- **Real workers in a browser:** a small `bench/run.mjs` suite (`worker`) loads three pages with `&thread=worker` and `&thread=main`: the spike's scene, an example with tick listeners and overlays, and a page with picks and heights. It checks that both modes render the same image (the parity suites' FLIP threshold) and answer the same queries.
- **The parity test of the protocol table** (section 3.1): every member of `api/surface.txt` has a kind; every command's arguments clone; every snapshot read has a section.

## 4. Prior art

All pages read 2026-11-13 unless marked. "Unread" means the page couldn't be opened and the fact comes from a search result only.

| System | What it does across threads | What we take | What we avoid |
| --- | --- | --- | --- |
| **three.js, OffscreenCanvas guide** (manual, "OffscreenCanvas"; read on a mirror of the manual, since threejs.org's URL returned 404 that day) | The page posts the canvas size on load and on every resize, since the worker can't read `clientWidth`. Picks run in the worker from normalized pointer coordinates. `ElementProxy` copies only the event fields `OrbitControls` uses and posts them; a receiver in the worker re-dispatches them to a fake DOM element whose `preventDefault` does nothing. Without `transferControlToOffscreen` it runs the same code on the page. The guide calls its `ownerDocument` and `self.document = {}` workarounds hacks. | One engine module that runs in either place; size and pixel ratio as messages; only the input fields the engine reads; the page decides `preventDefault`. | A fake DOM that grows with every control. We define a typed input stream instead. |
| **Babylon.js** (doc.babylonjs.com, "Offscreen Canvas", undated) | The engine can run in a worker since 4.1. `attachControls()` doesn't work there; the page posts input and resizes. Forum threads (unread) reported WebGPU on an `OffscreenCanvas` drawing nothing where WebGL 2 worked; the current state is unconfirmed. | Confirmation that input and resize must be forwarded. | Leaving the message layer to the app, which is the gap this façade fills. |
| **Comlink** (github.com/GoogleChromeLabs/comlink, `src/comlink.ts`; 4.4.2, 2024-11-07) | Async calls through a `Proxy` over `postMessage`. Pending calls in a map keyed by a random id. Thrown errors cross as message, name and stack, rebuilt as a plain `Error`. `releaseProxy`, plus a `FinalizationRegistry`, releases remote objects. No cancellation, no timeouts. The README gives no performance figures. | The id-to-resolver table; transfer lists as a first-class marker; explicit release of remote objects. | Per-property round trips hidden behind a proxy; lossy error rebuilding; a second channel that isn't ordered with commands (section 3.4). |
| **MapLibre GL JS** (`src/util/actor.ts`, `dispatcher.ts`, `source/worker.ts` on main) | Rendering stays on the page; workers parse tiles and GeoJSON. A shared pool hands out actors round-robin; messages carry a map id. Each message has an id and an `AbortController`: aborting rejects the caller with `AbortError` and sends a cancel. The worker queues tasks so a cancel can remove a queued task or abort a running one, and drops late replies. No batching. Mapbox GL JS's source wasn't read; that it shares the design is unconfirmed. | Query ids with `AbortController`, a cancel message, a worker that sees cancels between tasks, late replies dropped. | Unbatched messages. |
| **Figma's plugin system** (blog "How we built the Figma plugin system", 2019-08-22; "An update on plugin security", 2019-10-02; developer docs "How plugins run", undated) | Their first design ran plugins in an iframe and copied the document across: `await` everywhere was hard for plugin authors, and a large file took about 14 s to serialize. A message round trip was about 0.1 ms. They chose synchronous access on the main thread in a sandbox (Realms, then QuickJS in WebAssembly after an escape bug), behind a small audited interface of about 500 lines so the backend can be swapped. | Synchronous reads are worth a lot to app authors, which is why mirrored and snapshot reads stay synchronous here; a small interface behind the API so the backend can change. | Copying the whole scene per call. Their synchronous model needs one thread, which worker mode gives up. |
| **Unreal, threaded rendering** (dev.epicgames.com, "Threaded Rendering", undated) | The render thread runs a tick or two behind the game thread. The game thread owns the objects; the render thread owns proxies, fed by copied, enqueued commands. The game thread blocks at the end of its tick if the render thread falls more than a tick or two behind. `FRenderCommandFence` is polled or waited on. A blocking flush exists for the editor and offline work. | Ownership on one side, copies to the other; a fence polled, not waited on, in the hot path; a bound on how far one side may run ahead. | Blocking reads in the hot path. |
| **bgfx** (bkaradzic.github.io/bgfx/internals.html) | Two frame buffers: the API thread's `frame()` waits for the render thread, swaps and signals, so the pipeline is one tick deep. If init and rendering run on one thread it switches to single-threaded mode and `frame()` renders inline. A 5,000 ms timeout flags a deadlock. | A same-thread mode that is the same code with the hand-off made direct (our `direct` transport); a watchdog. | |
| **Unity** (docs.unity.com, `RenderingThreadingMode`, 6000.6) | The threading mode is chosen at startup from settings and platform and is readable at run time; a single-threaded mode exists for debugging. | The mode is readable at run time (`engine.thread`). | |
| **Destiny's renderer** (Tatarchuk, GDC 2015; PDF unread) | From a search summary, unconfirmed: simulation of tick N overlaps rendering of tick N−1 on a copy of the game state. | (Same lesson as Unreal, if confirmed.) | |
| **Worklets** (MDN: `Worklet`, `AudioWorklet`, `AudioWorkletProcessor`, CSS Painting API; undated) | Code loads by URL (`addModule(url)`); static imports only, no dynamic `import()`. AudioWorklet registers a processor class by name; the host constructs it; parameters are declared statically and arrive as data; a `MessagePort` talks to the page. | Tick and controller modules: loaded by URL, registered by name, inputs declared, parameters as plain data, constructed by the engine, a port to the page, no closures from the page. | Assuming one instance or that dynamic import works inside a module the engine loads. |
| **Partytown** (partytown.qwik.dev: "How does Partytown work", "Atomics", "Trade-offs") | Makes DOM reads from a worker synchronous: with isolation, `Atomics.wait` in the worker (they claim about ten times faster), else a synchronous XHR caught by a service worker. A blocking read "may take a few milliseconds"; loops that read layout overwhelm it; `preventDefault` has no effect. | Evidence that synchronous reads across threads need isolation and cost milliseconds, and the page can't block on `Atomics.wait`. So worker mode offers no synchronous engine reads beyond the snapshot. | Synchronous cross-thread reads. |
| **React Native's new architecture** (reactnative.dev, "About the New Architecture") | The old bridge was async and serialized every crossing; JSI makes direct synchronous calls, so a layout read and a state update land together. The page warns there's no gain if serialization wasn't the bottleneck. | Why the main-thread transport calls directly, with no encoding. | Expecting JSI's synchronous calls across a worker: JSI shares a process heap. |
| **deck.gl** (deck.gl, "Performance Optimization") | Workers load data and build attributes, with typed arrays transferred. No rendering in a worker. | Transfer typed arrays; content stays on its own path (the job system). | |
| **Platform facts** (MDN: `transferControlToOffscreen`, `DedicatedWorkerGlobalScope.requestAnimationFrame`, `GPUDevice.lost`, `Atomics.waitAsync`) | `transferControlToOffscreen` throws `InvalidStateError` if a context exists or the canvas was transferred; Baseline since March 2023. Worker `requestAnimationFrame`: dedicated workers with an owner window, paused in background tabs; Baseline since March 2023. `device.lost` resolves with a reason; the app recreates the device and its resources; nothing worker-specific. `Atomics.waitAsync` doesn't block, works on the page, Baseline since November 2025, needs isolation. | The probe before the transfer; the watchdog paused while the page is hidden; device loss handled in the worker; `waitAsync` as a later option for a shared snapshot. | |

**What we take overall.**

1. One engine module that runs in either place, with the main-thread mode as the same code over a direct hand-off (three.js, bgfx).
2. The page owns the DOM and forwards a typed input stream plus size, pixel ratio and a `preventDefault` policy; no fake DOM (three.js, Babylon.js).
3. Ordered, batched, fire-and-forget commands. None of the web libraries read batch their messages; the game engines do, per tick (Unreal, bgfx).
4. Reads from a snapshot one tick old, never blocking (Unreal, bgfx, Partytown's costs).
5. Queries with ids, `AbortController`, a cancel message and late replies dropped (MapLibre, Comlink's table).
6. Errors with a typed code, not a rebuilt plain `Error` (Comlink's weakness).
7. App code inside the engine loaded by URL, registered by name, with plain-data parameters (worklets).
8. Synchronous reads matter to app authors (Figma), so mirrored and snapshot reads stay synchronous; arbitrary-argument reads become tracked points or promises.

## 5. Performance

### What the spike measured

Headless Edge on this machine's GPU, shared with other sessions, 2026-11-13, two rounds (§13.43, "Spike"):

| Measure | Main thread | Main, busy page | Worker | Worker, busy page |
| --- | --- | --- | --- | --- |
| Tick gap p90 / p99, ms | 16.7 / 16.8 · 33 / 50 | 16.8 / 33 · 33 / 50 | 33 / 50 · 16.7 / 16.8 | 33 / 67 · 50 / 83 |
| Input → GPU done, p50 / p90, ms | 20 / 25 · 30 / 42 | 26 / 60 · 39 / 86 | 25 / 39 · 22 / 28 | 28 / 50 · 55 / 98 |
| Pick, p50 / p90, ms | 4.2 / 14.5 · 14 / 18 | 5.8 / 53 · 13 / 55 | 1.3 / 1.9 · 1.5 / 3.0 | 1.3 / 2.5 · 1.7 / 8.2 |
| HTML pin behind the canvas, p90 / max, ms | 0 / 0 | 0 / 0 | 0.2 / 2 · 0.1 / 0.2 | 34 / 111 · 32 / 48 |
| Page load to first image, ms | 785 · 2,250 | | 2,594 · 3,854 | |

What it shows, and what it can't:

- Rendering continues through a blocked page in a worker (the M0 smoke test: the heading went from 11° to 95° across a 3 s block).
- Input doesn't get faster: it arrives on the page, and a busy page delays it in both modes.
- Picks answer faster from the worker.
- HTML overlays lag in a worker when the page is busy.
- Starting in a worker costs about 1.2–2 s more in development, where the dev server serves modules unbundled. A production build hasn't been measured.
- Frame stability: can't tell. The two rounds disagree, and the GPU was shared.
- The spike forwarded only a heading and a pick, so it measured no command batching, no snapshot and no query protocol.

### Round-trip costs of queries

A query's time in worker mode is: the page's flush (a microtask), the message to the worker, the wait until the worker's current task ends (up to a tick's CPU time: about 3 ms for the render alone, and tens of ms on the deep views, where §13.43's profiles found selection filling about half of each gap), the query's own work, and the reply's message back, which waits until the page's current task ends. The two message hops are small when both threads are idle. The two waits dominate, and they are why WF-11 measures queries on a busy page and during heavy ticks, not only idle.

What WF-11 records for each query kind (pick, `heightAt`, `castRays`, `converged`): p50, p90 and p99 from the call to the answer on the page's clock, in both modes, idle and busy page.

### Snapshot cost

The budget in section 3.3: 8 KB per snapshot in steady state, 64 KB with the inspector, recorder or tracked points. WF-11 records the size of each snapshot, the time to build it on the engine's side, the time to post it, and the time from the worker's post to the page's `onAfterTick`.

### When worker mode becomes the default

Decision 10 sets the gate. This plan makes it concrete (question Q8):

- **Where:** headed Chrome on an otherwise idle GPU, on an Apple-silicon Mac and a Windows machine with a discrete GPU, three alternating runs per mode, on the vertical-exaggeration example (`?x=4` and `zermatt-close`), the spike's scene and one tick-listener-heavy example, each idle and with the busy-page load.
- **Measured with:** the recorder and `gpuprobe` (submit to done), per §13.43's next step 1, plus WF-11's query and snapshot columns.
- **Worker mode becomes the default for `"auto"` when, in both machines' runs:**
  - tick gap p99 is no worse than main-thread mode with the page idle, and better with the page busy;
  - input to GPU done p90 is within one tick of main-thread mode with the page idle;
  - query p90 is no worse than main-thread mode;
  - startup in a production build is no more than 300 ms slower;
  - the API suite passes in both runs and the `worker` browser suite renders the same images.
- Until then, Dyno offers `&thread=` and the probe's answer shows in the inspector.

## 6. Milestones

Each is sized for one agent. Dependencies are listed with each; milestones on different lines of the graph can run in parallel.

```text
WF-1 protocol table ──┬── WF-2a reads ─────────┐
                      ├── WF-2b writes ────────┤
                      ├── WF-2d internals out ─┼── WF-3 façade + direct ── WF-4 channel + dual-mode tests ── WF-5 worker backend ──┬── WF-6 probe
                      └── WF-2c functions (modules now; IR forms with IR-13)                                                ├── WF-7 errors and loss
                                                                                                                           ├── WF-8 modules (tick, controller)
                                                                                                                           ├── WF-9 widgets, inspector, recorder, __cesium
                                                                                                                           └── WF-12 other plans plug in
                                                                        WF-6 + WF-9 ── WF-11 measurements and the default ── WF-10 shared snapshot (only if WF-11 asks)
```

| # | Milestone | Depends on | Files | Done when |
| --- | --- | --- | --- | --- |
| WF-1 | **The protocol table, no behaviour change.** Every public member classified by kind (section 1), with its argument schema and what it transfers. A test compares the table with `api/surface.txt` and fails on a member with no kind. `npm run surface` writes the kind column. | — | new `src/thread/protocol.ts`; `scripts/surface.mjs` (or the surface script); new `test/threadProtocol.test.ts`; `api/surface.txt` | Every member of `api/surface.txt` has a kind; the counts match section 1; a new export without a kind fails the test. |
| WF-2a | **Reads reshaped, on the main thread.** `heightAt` (promise) replaces `sampleHeight` and `surfaceHeight`; `feature(id)` becomes a promise; `view.track(point)` publishes pixel, height and visibility per tick; `toPixel` and `fromPixel` computed from the camera and viewport alone; snapshot reads go through one per-tick snapshot object (`engine.snapshot`). Callers in `examples/`, `widgets/`, `bench/` and `test/` move. | WF-1 | `View.ts`, `Engine.ts`, the terrain and tileset sources, `Clamp`, new `src/scene/snapshot.ts`, `src/scene/tracked.ts`, callers | No public synchronous read takes arbitrary arguments except `toPixel` and `fromPixel`; the examples run unchanged to the eye (the parity suites at their baselines). |
| WF-2b | **Writes reshaped, on the main thread.** In-place mutations become setters: `sunDirection`, `icrfToFixed`, camera vectors (no more `version++` by hand), `viewport`, `observer`, `lighting`, `View.overlays`, the `tileset.selection` proxy. Handles get page-named ids; slot numbers and capacity errors become handle events (`status`, `ready`, `error`). Engine errors are delivered as events, not thrown from the call (question Q5). | WF-1 | `Camera.ts`, `View.ts`, `World.ts`, `Engine.ts`, `Tileset3D.ts`, callers | No public object is read by the engine after the app mutates it in place; `requestRender()` is no longer needed for any public write (the docs' list in `renderMode` is empty). |
| WF-2c | **Functions reshaped.** Every public parameter that takes a function takes a module reference now, and a Cesium IR program or a self-contained function (lowered by source text) when IR-13's restricted-JS front end lands. Closures are refused with a diagnostic (question Q1). Covers warps, smooth edges, frame resolvers and `toParent`, standing queries, `debugTileColor`, `addFrameCompute`. | WF-1; the IR forms: Cesium IR IR-6, IR-8, IR-9, IR-13 | `src/transform/`, `src/frames/`, `src/query/`, `Engine.ts`, new `src/thread/modules.ts` | No public parameter's type is a bare function; the transform-graph and frames examples run on module or program forms; JP-5's fits run off the main thread for every program-form warp. |
| WF-2d | **Internals out of the main entry** (question Q10). The 136 exported engine internals move to `@cesium/next/gpu` or stop being exported; `HeightCapture`'s CPU grid becomes a snapshot section; option types that hold engine objects take handles. | WF-1; decision 11's `@cesium/next/gpu` entry (profiles plan) | `src/index.ts`, new or existing `src/gpu/index.ts`, `World.ts`, `Engine.ts`, `test/importBoundary.test.ts`, `api/surface.txt`, night-sky and translucency examples | The main entry exports no member of kind "can't cross"; the import-boundary test enforces it; night-sky and translucency run (on a stage module, or forced to main-thread mode). |
| WF-3 | **The façade and the direct transport.** Public classes become the façade; today's classes become the internal engine run by the host. Mirrored state, the snapshot store, the command encoder and decoder, the query table, `appliedSeq` reconciliation. Main-thread mode runs through it. | WF-2a, WF-2b, WF-2d (WF-2c can follow) | new `src/thread/` (`facade/`, `host.ts`, `transport.ts`, `snapshotStore.ts`, `queries.ts`); `src/index.ts`; `api/surface.txt` | The full suite passes in main-thread mode; per-command overhead measured in a Node micro-benchmark and recorded; `api/surface.txt` changes only where WF-2 changed it. |
| WF-4 | **The channel transport and the API suite in both modes.** `MessageChannel` transport with strict cloning; `test/api/` with a lint rule against deep imports; vitest projects `main` and `channel`; `await engine.nextTick()`. | WF-3 | `src/thread/transport.ts`, `vitest.config.ts` (or the workspace file), `test/api/**`, the lint config | `npm test` runs the API suite in both modes, and both pass; a test that passes a closure or a DOM object fails in `channel` with the façade's diagnostic. |
| WF-5 | **The worker backend.** The engine's worker entry; `OffscreenCanvas` transfer per view; resize and pixel ratio; the input stream and its `preventDefault` policy; built-in controllers on the engine's side; nested content workers; the worker in the library build (`?worker&url`, `workerStart`'s `blob:` trampoline) and the dev server. | WF-4 | new `src/thread/engineWorker.ts`, `src/thread/input.ts`, `src/thread/resize.ts`; `renderTarget.ts`; the controllers; `vite.lib.config.ts`; `scripts/checkBundle.mjs` | The `worker` browser suite (section 3.9) renders the same images in both modes on its three pages; the M0 smoke test passes through the façade; `checkBundle` shows the worker chunk and keeps it out of the main chunk. |
| WF-6 | **The probe and `thread: "auto"`.** Probe in the worker that becomes the engine's worker; cache per user agent and build; forced modes; `engine.thread` and `threadReason`; Dyno's `&thread=`; the inspector's header row. | WF-5 | new `src/thread/probe.ts`, `Engine` options, `widgets/inspector.ts`, Dyno | Tests (fake worker): a worker that can't start, no `navigator.gpu`, no adapter, no context, a timeout, a cached answer that fails; the inspector shows mode and reason; forced `"worker"` rejects with the reason. |
| WF-7 | **Errors and loss.** Error serialization with codes; development-build page stacks per `seq`; device loss forwarded; worker loss (errors, `messageerror`, the visible-page watchdog); `engine.onLost`, `state`, `restart()` with canvas replacement. | WF-5 | `src/thread/errors.ts`, `host.ts`, `transport.ts`, `GpuDevice.ts` | Tests on the channel transport for each error path; a browser check that kills the worker and restarts on a fresh canvas, in a worker and then on the main thread. |
| WF-8 | **Modules in the engine's thread.** `engine.addTickModule(url, { params })`, `view.setController(url, { params })`, the module loader shared with app jobs (§13.43's `engine.jobs.run(moduleUrl, …)` later), `ctx.post`, parameters by command. Same in both modes (main-thread mode imports the module on the page). | WF-3 (works in main-thread mode), WF-5 (worker) | `src/thread/modules.ts`, `Engine.ts`, the controllers | A tick module changes the scene in the tick it runs in both modes (test); a controller module drives the camera from forwarded input in the worker suite. |
| WF-9 | **Widgets, the inspector, the recorder and `__cesium`.** Widgets on the façade only; the inspector's section requested by command while open; recorder rows built on the engine's side and batched; the debug handle (section 6.1). | WF-5 | `widgets/**`, `widgets/recorder.ts`, `recorderRows.ts`, the `__cesium` setter, `bench/` and `scripts/` readers | The Viewer and inspector work in both modes (owner review by clicking around, per the UI bar); a recording from a worker run has the same columns as a main-thread one; the bench readers pass in both modes. |
| WF-10 | **Shared snapshot (only if WF-11 asks).** Cameras and tracked points in a `SharedArrayBuffer` double buffer with a sequence counter, when `sharedMemory()` holds. | WF-11 | `src/thread/snapshotStore.ts`, `host.ts` | A/B under isolation shows the saving WF-11 asked for; behaviour identical with and without isolation (both vitest modes, plus an isolated browser run). |
| WF-11 | **Measurements and the default.** Section 5's runs; recorder columns for snapshot size, build and post time, arrival lag, query latency per kind; the decision written into §13.43 with the data. | WF-6, WF-9 | `bench/suite/`, `bench/run.mjs`, `widgets/recorderRows.ts`, the plan | The runs are recorded in `bench/results` and §13.43; the owner decides from them whether `"auto"` picks the worker. |
| WF-12 | **Other plans plug in** (section 6.2): refinement R2/R3's worker mode, profiles M9, the examples' migration, the handbook's threading tab. | WF-5; each item also needs its own plan's milestone | as listed in section 6.2 | Each item's own "done when" in section 6.2. |

### 6.1 The `globalThis.__cesium` debug handle

What exists (2026-11-13): `debugHandle()` (`widgets/engine.ts:131-155`), called from `inspectEngine()` in development builds only, sets `globalThis.__cesium = { engine, tilesets, engines: { [name]: { engine, tilesets } } }`, holding the live `Engine` through a `WeakRef`. No script, test, benchmark or spike reads it; the handbook's Dyno tab documents it (`handbook/src/tabs/dyno.tsx:1051`). Scripts use `globalThis.dynoViewer` and `dynoExamplesViewer` (full `Viewer` objects; `bench/suite/views/Viewer.tsx:263`, `Examples.tsx:483`) instead: `bench/trace.mjs` reads tilesets' `show`, `idle` and `stats.loaded` synchronously and calls `controller.focus`; `scripts/galleryNav.mjs` reads the engine's private listener tables, views, worlds and links to find leaks, and checks `WeakRef` identity; `scripts/retainers.mjs` checks retention.

In worker mode (WF-9):

- **`__cesium.engine` is the façade** on the page, so snapshot and mirrored reads work as they do in an app. `__cesium.thread` gives the mode, its reason and the memory mode.
- **`__cesium.debug(name, ...args)`** runs a named debug probe in the engine's thread and returns a promise of plain data. Probes are a fixed table in development builds (listener counts, views, worlds, links, tiles resident, a heap snapshot trigger), never arbitrary code. `galleryNav.mjs`'s leak checks move to probes, since the listener tables live in the worker.
- `bench/trace.mjs` keeps working on snapshot reads; `controller.focus` becomes a command.
- `dynoViewer` and `dynoExamplesViewer` stay page-side `Viewer` objects over the façade.

### 6.2 How the existing plans plug in

- **Refinement (§6 M11).** R2's `view.refinement` and `onRefinement` are a snapshot section, sent when a level, kind set or count changes. R3's `converged()` is a query evaluated at the end of the engine's ticks, with its timeout on the engine's side and abort as a cancel. R7's holds are commands. Its plan already says this ("Worker mode"); WF-12 checks it in the API suite's two modes. Order: R2 and R3 can land before WF-3, in-thread; they move onto the façade with WF-3, and their tests join the API suite in WF-4.
- **Engine profiles M9.** `SupportReport`, `EffectiveSettings` and notices are the snapshot's support section. `strict` validation of a pinned step runs on the page against that section, so it can still throw synchronously (an argument error, section 3.7). The thread mode and its reason are profile facts. M9 is done when the profiles tests pass in both modes; it needs WF-4.
- **App jobs (§13.43, "Owner's decisions after review").** `engine.jobs.run(moduleUrl, name, input, { priority, signal })` is a query; its async-iterator form is a query that yields partial results as reply messages; the optional `apply(result)` step runs on the engine's side in the apply phase. Its module loading is WF-8's loader. App jobs wait on JP-1 to JP-9 as decided; nothing in this plan moves them earlier.
- **The inspector.** The Jobs section, the refinement table and the profile rows read snapshot sections that exist only while the inspector is open. The header gains the thread mode, its reason and the memory mode (WF-6, WF-9).
- **The recorder.** Rows are built where the engine runs and sent in batches (WF-9). New columns from WF-11: `snapshot_bytes`, `snapshot_build_ms`, `snapshot_lag_ms`, `query_ms_<kind>`.
- **The job system.** Unchanged: `Jobs` and `WorkerPool` run inside the engine's thread, whichever it is; content workers are nested in worker mode. The apply phase runs on the engine's thread. `jobMemory()` already reports per thread.
- **Cesium IR.** IR-13's program inputs are what crosses for every function parameter (WF-2c). The restricted-JS front end gains one entry: a self-contained function by its source text.
- **The WebGL 2 renderer.** The probe gains `getContext("webgl2")` (WF-6). Nothing else here depends on the renderer.
- **The examples.** Each moves to the reshaped API in WF-2a to WF-2c, one area per commit, then runs in both modes in WF-12. The vertical-exaggeration example comes first, as §13.43's next step 5 asks (its tick listeners read cameras, heights and stats).
- **The handbook.** A threading tab, or a section of the architecture tab: the two modes, the four kinds of member, the probe, and the measured costs. Its "checked" date and status follow the AGENTS rule.

## 7. Open questions for the owner

Each has a recommendation and the alternative.

| # | Question | Recommendation | Alternative |
| --- | --- | --- | --- |
| Q1 | **Closures:** are JS closures refused in both modes once the façade lands? | **Yes, refused in both.** Functions are Cesium IR programs or self-contained functions lowered by source text (with IR-13), and modules by URL until then. An app then works in both modes or fails in both, with a diagnostic naming the captured variable. | Keep closures in main-thread mode only (as `fromFunction` keeps an unparsable function today) and refuse them in worker mode. Less migration now (22 `Frame` and `smoothFrame` closure sites in 14 example files), but an app can pass its tests in one mode and fail in the other, and `"auto"` can't know in advance that an app will register one. |
| Q2 | **Main-thread mode through the façade:** does main-thread mode read engine state from the snapshot (one tick old), like worker mode? | **Yes.** One code path, the direct transport, the same staleness in both modes, so the API tests mean the same thing in each. It is what the refinement plan already says ("in main-thread mode it is the last tick's"). | Main-thread mode reads engine state live ("a snapshot is simply current", §13.43). Today's behaviour, but a test can then pass in main-thread mode by reading a value worker mode would show a tick later. |
| Q3 | **Forced `thread: "worker"` that can't run:** reject, or fall back? | **Reject `Engine.create`** with the probe's reason. A host that forces the worker wants to know. `"auto"` falls back. | Fall back to main-thread mode with a notice in the support report and the inspector. |
| Q4 | **Comlink for queries** (§13.43 asked to evaluate it). | **Don't adopt it.** Queries must be ordered with commands in one stream, and Comlink would add a second channel. Ids, cancellation and late-reply dropping are about a hundred lines (MapLibre's actor has the same shape). | Adopt Comlink (4.3 / 1.9 kB) for queries only, with an explicit flush of pending commands before each query. |
| Q5 | **Engine errors' timing:** do errors only the engine can detect (capacity, compile, GPU validation) become events in main-thread mode too, rather than throwing from the call? | **Yes, events in both modes.** The façade's argument checks still throw synchronously. Errors then arrive the same way in both modes, and tests catch them the same way. | Main-thread mode keeps throwing them from the call; worker mode reports them as events. Simpler today, but the two modes then need different error handling in app code. |
| Q6 | **HTML overlays in worker mode:** accept the lag, or offer a synchronized present? | **Accept and document it** for now: tracked points in the snapshot, about two ticks behind under a busy page; in-engine labels for no lag; main-thread mode for hosts that need DOM and canvas in the same presented frame. | A synchronized present: the worker renders, calls `transferToImageBitmap()` and posts the bitmap with that tick's tracked points; the page shows both in one `requestAnimationFrame` through a `bitmaprenderer` canvas. Overlays then match the image exactly, at the cost of a copy per tick and up to a tick more latency. Could be a later per-view option. |
| Q7 | **Recovery after worker loss or device loss:** report it, or rebuild the scene? | **Report it, and offer `restart()` on a fresh canvas** (WF-7). The app rebuilds its scene, as it would after a reload. | Replay: the façade's mirror of app-authored state is enough to recreate every live handle in a new engine, after worker loss or device loss, in both modes. This is the rebuild `Engine.create`'s comment defers ("recovery stops at the device"). Worth its own milestone later if hosts ask. |
| Q8 | **What `"auto"` resolves to before the WF-11 gate passes.** | **The main thread, while the probe still runs and reports what it would pick** (inspector, `threadReason`: "worker available; main by default until measured"). Dyno's `&thread=worker` forces the worker for testing. Passing the gate flips one constant. The gate's thresholds are in section 5. | `"auto"` picks the worker as soon as WF-6 lands, in the library and in Dyno, with main-thread mode as the fallback only. |
| Q9 | **Large arrays in commands:** copied or transferred by default? | **Copied by default**, so the app keeps its arrays in both modes; `{ transfer: true }` detaches them in both modes (main-thread mode detaches too). | Transferred by default: faster for big meshes, but the app's arrays are detached in worker mode and not in main-thread mode, unless main-thread mode emulates it. |
| Q10 | **The 136 engine internals exported today** (`World`'s GPU buffers, render bundles and encoders, `Tile` graph links, `ChainIo`, `Engine.ctx`, `HeightCapture`'s GPU objects…): where do they go? | **Out of the main entry, into the advanced `@cesium/next/gpu` entry (main-thread mode only) or unexported** (WF-2d), as decision 11 already does for `GpuDevice`. The two examples that use the device directly (night-sky, translucency) move to a stage module or force main-thread mode. | Keep them exported and document them as main-thread-only. The main entry then carries members that throw in worker mode, which decision 7 rules out. |

## 8. Owner's answers (2026-11-13)

- **Q1, closures:** refused in both modes, **but only once IR-13's self-contained-function path exists**, so the examples migrate once (not to modules and then to functions). Until then WF-2c adds the module and program forms beside closures. Callbacks that run on the page (`onTick` in worker mode, `onAfterTick`, events, page-side controllers) take ordinary closures in both modes; only functions the engine runs on its own thread need a program, a self-contained function or a module. The docs say that line plainly.
- **Q2 to Q5, Q8 to Q10:** accepted as recommended.
- **Q6, HTML overlays:** HTML overlays don't belong in the engine. The engine publishes tracked points (pixel, height, visibility) each tick, and placing DOM is the app's. The synchronized-present option is dropped. Drawing labels and pins in the engine comes with vector rendering, later. (`View.overlays` is in-engine line lists and unaffected.)
- **Q7, recovery:** report it and offer `restart()`, **and include the scene rebuild as an opt-in** (a flag on `Engine.create` or `restart`): the façade's mirror of app-authored state replays every live handle into a new engine after worker loss or device loss, in both modes. New milestone WF-7b.
- **Sequencing with the API review (Plan 5i):** WF-1's protocol table is the review's "map of today's surface". The order is WF-1, then the 5i review with the façade's constraints in hand, then WF-2a to WF-2d, so the API is reshaped once.
- **Proposed at review, pending the owner:** observed value types for writable engine state (camera vectors, sun direction, warp parameters) that turn in-place writes (`camera.position.x = 5`, `.set(…)`) into commands, in place of WF-2b's setters, so code written the three.js way works in both modes; and the 5i review checking the final API against three.js, Babylon.js and MapLibre idioms.

| # | Milestone | Needs | Files | Done when |
| --- | --- | --- | --- | --- |
| WF-7b | **Scene rebuild on loss, opt-in.** Replay the façade's mirror (every live handle, its options and app-authored state) into a fresh engine after worker loss or device loss, in both modes; the flag on `Engine.create` and `restart`; handles keep their ids. | WF-7 | `src/thread/facade/`, `host.ts`, `errors.ts` | A test kills the engine (channel transport) and the rebuilt scene matches the mirror; a browser check loses the device and comes back with the same scene, in a worker and on the main thread. |
