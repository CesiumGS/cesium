# The WebGPU seams audited (CS-430)

**What this holds:** Every seam for later WebGPU features that the engine has today: what goes through it, where it lives, its bypass test, and what that test catches and misses. Then the seams still missing, with what each would cost today. It is the list the first public API review (CS-102) takes, and the owner's decision on the review's proposals (CS-438) names it. The source is spec section 7.10 and its "Each seam gets a bypass test" rule (`docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`), which repeats the owner's input in `docs/design/bodies-frames-and-engineering-coordinates.md`, "groundwork for post-V1 WebGPU features". Written 2026-11-20.

**The rule every seam is held to:** "Only where the seam costs nothing today; no design compromises in the current WebGPU path." Where a seam would cost something, this document says so and says what.

**What was read.** The code and tests at commit `99c8aeea5b` on the main line (after CS-33, CS-567, CS-50 and CS-745 merged). CS-23 and CS-34 were changing `packages/core/src/scene`, `packages/core/src/render`, `packages/core/src/profile` and `packages/core/src/globe` at the same time. Anything they merge after that commit is not in this list. Paths start at the repository root. Nothing in the code changed.

## The short version

- **Nine seams are in place.** Eight have a bypass test that fails when a line goes around the seam. The ninth, the acceleration-structure hook, has a test that every add, remove, placement and unload reaches it. That test is not a bypass test.
- **Every bypass test bit when a bypass was planted** in what it guards. "How the tests were checked" lists each plant and the failure it gave, and the few tests that were not planted.
- **The tests have holes.** Five more plants, each outside what its test guards but inside what its seam is for, passed. Two more holes are plain in the code. "Where the tests do not reach" lists all seven. Each is cheap to close, and none changes the WebGPU path.
- **Six seams are still missing.** Two pass the rule today: the property textures behind an accessor, and the acceleration hook's per-tick event. One passes on cost and waits on a format: cluster data in the content format. Three do not pass today, and the document says why: picks through the query interface, per-pass constants, and queue affinity in the pass graph.
- **Two of the spec's "not touched by plan 5" items need no seam.** The capability registry already is the seam for subgroup and 64-bit atomic paths. Slang per capability is in place by absence: nothing reads a capability in Slang.

## The seams in place

| Seam | What goes through it | Lives in | Bypass test |
| --- | --- | --- | --- |
| Per-draw constants | Every draw record, written on the CPU and read in Slang | `packages/core/src/render/drawConstants.ts`, `drawRecord` in four Slang modules | `test/seams.test.ts`: three tests |
| Per-draw placements | The placements buffer, one row a placed draw | `packages/core/src/scene/placementTable.ts`, `packages/core/src/shaders/placement.slang` | `test/seams.test.ts`: two tests |
| Draw arguments | Indirect draw arguments and item lists | `packages/core/src/render/drawArguments.ts`, `packages/core/src/shaders/cullTables.slang` | `test/seams.test.ts`: two tests, and `DrawArguments.slotOf` |
| Geometry submission | Every content draw and every vertex and index buffer bind | `packages/core/src/render/drawArguments.ts` | `test/seams.test.ts`: two tests |
| Rays and spatial queries | Rays from the examples and `measure` | `packages/core/src/query` | `test/seams.test.ts` and `test/raySeam.ts` |
| Bindless resources | Material texture reads | `materialTexture` in `packages/core/src/shaders/surface.slang` | `test/bindless.test.ts` |
| Acceleration-structure hook | A tile's placement and unload, a draw's add and removal | `packages/core/src/streaming/acceleration.ts` | `test/acceleration.test.ts` (not a bypass test) |
| Capability registry | What the device offers, and the paths chosen from it | `packages/core/src/gpu/GpuDevice.ts`, `packages/core/src/profile/paths.ts` | `test/deviceFactsSeam.test.ts`, and `test/paths.test.ts` (not a bypass test) |
| Renderer seam | What the scene's holders reach of a renderer | `packages/core/src/scene/renderSeam.ts` | `test/importBoundary.test.ts`: `SEAM_EDGES` and the tier tests |

### 1. Per-draw constants

- **What goes through it.** Every draw record: bounds, color, material, transform, flags, feature base, imagery slice, view mask, clip block, placement, instances, morph. The records keep the layout of `writeDrawRecord` in `packages/core/src/render/layout.ts`.
- **Where it lives.** The writer is `DrawConstants` in `packages/core/src/render/drawConstants.ts`: a CPU table with a change log and a `createMirror` for a device. The world holds it as `WorldDraws.drawConstants` (`packages/core/src/scene/world/worldDraws.ts`). The reader is Slang `drawRecord(index)`, defined once each in `cullTables.slang`, `surface.slang`, `raycast.slang` and `layouts.slang` under `packages/core/src/shaders`.
- **What replaces it.** Immediates, or another layout of the per-draw data, replace that one class and that one function. No caller changes.
- **Its bypass tests**, all in `test/seams.test.ts`, under "the per-draw constants seam":
  - "writes draw records only in src/render/drawConstants.ts". It catches an element of a record array assigned (directly, through a local alias or through a destructure), a record array filled, set or cast, a call to `writeDrawRecord`, and a second `MirroredTable` of records.
  - "reads draw records in Slang only through drawRecord". It catches `records[` outside `drawRecord`, a second definition of `drawRecord`, and a draw-record buffer under any other name, in any Slang module.
  - "writes the records' GPU table only through the seam". It catches `writeBuffer`, `clearBuffer` or `copyBufferToBuffer` that names the records' buffer, the constants' buffer or the draw arguments' buffers, outside `drawConstants.ts` and `drawArguments.ts`.
  - Each detector is first shown to flag a bypass, one test a detector, in "seam detectors flag bypasses".
- **What these tests do not catch.** They match names. A helper that renames `recordsU32` before writing it escapes the first one, and the layers note says so (`docs/design/layers-engine-renderer-backend.md`, last list). Reads in TypeScript are allowed on purpose.

### 2. Per-draw placements

- **What goes through it.** The placements buffer, which holds the per-draw data that placements add. A record's placement word points into it.
- **Where it lives.** The writer is `packages/core/src/scene/placementTable.ts`; the one Slang reader is `placementRow` in `packages/core/src/shaders/placement.slang`.
- **What replaces it.** A per-draw data backend, or the later tessellation engine, replaces those two.
- **Its bypass tests**, in `seams.test.ts` under "the placements buffer":
  - "is read in Slang only through placement.slang's placementRow". It also refuses a second `placements` buffer or a second `placementRow`.
  - "is written only by src/scene/placementTable.ts". It also refuses the label `"world.placements"` anywhere else.

### 3. Draw arguments

- **What goes through it.** The indirect draw arguments, five 32-bit words a batch, and the item lists the batches draw from. A record's pointer to its arguments is its batch.
- **Where it lives.** The CPU side is `DrawArguments` in `packages/core/src/render/drawArguments.ts`, the only writer of its buffers. The GPU side is the eleven accessors of `packages/core/src/shaders/cullTables.slang` (`argumentSlot`, `countInstance`, `countedInstances`, `storeIndexedArguments`, `storeArgument`, `countChunks`, `countedChunks`, `storePatchArguments`, `retestArgumentSlot`, `addToCounter`, `counted`).
- **What replaces it.** Multi-draw indirect replaces the per-batch loop in `DrawArguments.drawBatch`, and the pointer `slotOf`, not the callers.
- **Its bypass tests**, in `seams.test.ts`:
  - "issues indexed and indirect draws only in src/render/drawArguments.ts" ("the draw-arguments and geometry-submission seams"). One call is allowed elsewhere: the stars' strips in `packages/core/src/atmosphere/Sky.ts`, which have no index buffer and no draw record. The test pins that exact call and no other.
  - "reaches draw arguments in Slang only through cullTables' accessors". It also checks that all eleven accessors are defined in `cullTables.slang` and in no other module.
  - `DrawArguments.slotOf` "is the byte offset of the record's batch's arguments". It is a behavior test on the fake engine: the bundle must draw each batch from the offset `slotOf` gives, and a slot with no draw must throw.

### 4. Geometry submission

- **What goes through it.** Every content draw, and every vertex and index buffer bind.
- **Where it lives.** `packages/core/src/render/drawArguments.ts` for draws. Binds are allowed in two named places besides it: `bindSlab` in `packages/core/src/render/world/tables.ts` (the slabs' index buffers) and `drawOverlays` in `packages/core/src/render/view/outputPasses.ts`.
- **What replaces it.** A mesh-shader backend replaces the compute-plus-indirect stage behind it.
- **Its bypass tests**, in `seams.test.ts`. The first is the draw test above. The second is "binds vertex and index buffers only on the submission path". It names the class and member of every `setVertexBuffer` and `setIndexBuffer` call, so a new caller shows up by name.
- **What these tests do not catch.** `draw(` with no index and no indirect argument is not flagged on purpose (full-screen passes use it). A content draw that pulls everything from storage buffers and uses `draw(` would pass.

### 5. Rays and spatial queries

- **What goes through it.** `SpatialQueries` (`packages/core/src/query/queries.ts`, `Engine.queries`): rays in a named anchor or reference frame at a named scene time. It is asynchronous, batched, has standing queries, answers clear, blocked or unknown with reasons and accuracy, and says when a better answer may follow.
- **Where it lives.** The interface is `packages/core/src/query/queries.ts`. The backends are `terrainBackend.ts`, `drawBackend.ts`, `ellipsoidBackend.ts`, `geometryBackend.ts` and `frameRays.ts` in the same folder. A hardware ray-query engine is another `RayBackend` registered for a target.
- **What replaces it.** The backends, not the callers.
- **Its bypass test.** `test/seams.test.ts`, "the ray seam" > "examples and measure reach rays only through the query interface". The detector is `test/raySeam.ts`. It reads the TypeScript checker's view, so it follows what a name resolves to, not how it is spelled: an alias, a namespace import, the package's index, a dynamic or type import, a bracketed or destructured member. It flags any route to `castTerrainRay`, the draw, ellipsoid, geometry and `frameRays` backends, `World.castRays`, a tileset's `terrainRayTarget`, and (apart) a tile's retained `geometry`.
  - The scan covers `examples/**/*.ts` and `packages/measure/src/**/*.ts`.
  - Three examples keep retained geometry for something other than rays, each with its reason in `RETAINED_NOT_FOR_RAYS`: `design-globe/siteLoader.ts`, `clipping/main.ts` and `clipping/picks.ts`. The test fails when an allowance goes stale.
  - A second test, "the query interface's backends are where rays are reached", is a positive control: the scan must still see the backends reach rays.
  - The detector has its own test, "the ray seam's detector flags bypasses", over a snippet of forty-odd lines.
- **The interface's shape** is pinned by behavior tests, not bypass tests: `queries.test.ts` (22 `it` blocks) and `queriesEngine.test.ts` (6).

### 6. Bindless resources

- **What goes through it.** Material texture reads. Material records carry their texture references (`MaterialData.textures`); `World.textureRefs` makes them; Slang reads through `materialTexture` and asks for presence through `materialHasTexture`.
- **Where it lives.** `materialTexture` in `packages/core/src/shaders/surface.slang`, `materialTextureRef` and `materialHasTexture` in `packages/core/src/shaders/common.slang`, `World.textureRefs` in `packages/core/src/scene/World.ts`, and the group-2 layout `textureSetLayout` in `packages/core/src/scene/RenderContext.ts`.
- **What replaces it.** A resource table changes `materialTexture`, `textureRefs` and the group-2 layout, and nothing else (`docs/design/risks.md`, "Bindless textures").
- **Its bypass test.** `test/bindless.test.ts`, "reads material textures only through materialTexture". It scans every `.slang` and `.wgsl` source for the five material textures and their samplers outside the function. "flags material texture reads outside materialTexture" shows the detector bites in WGSL and Slang. "packs texture references two to a word, empty slots NO_TEXTURE" pins the record's packing.
- **What it does not catch.** See "Where the tests do not reach": the property textures.

### 7. The acceleration-structure hook

- **What goes through it.** Four events: `tilePlaced`, `tileUnloaded`, `drawAdded`, `drawRemoved` (`AccelerationStructures`, `packages/core/src/streaming/acceleration.ts`). The default is `NO_ACCELERATION`, held as `World.acceleration`.
- **Where each event is called.** `drawAdded` and `drawRemoved` in `packages/core/src/scene/world/draws.ts` (`addDraw`, `removeDraw`); `tilePlaced` in `packages/core/src/streaming/tilesetUpload.ts`; `tileUnloaded` in `packages/core/src/streaming/tilesetEviction.ts`. Order is fixed: a tile's draws are added before its placement is announced, and its unload is announced before they are removed.
- **Its test.** `test/acceleration.test.ts`: "is a no-op by default", "sees every draw added and removed by the world", and "sees every tile placed and unloaded, with its draws, on a streamed tileset". It runs the real paths on the fake engine. It is a completeness test: it fails when a path drops an event. It does not scan for a path that adds a draw without calling the hook.
- **A fact the test does not pin.** `DrawConstants.write`, which makes a record, is called once, in `addDraw`. A scan test for that one call would turn the completeness test into a bypass test (see "Proposals for the review").

### 8. The capability registry

- **What goes through it.** Everything the device offers: its features, limits tier, adapter, capabilities and probe results (`DeviceFacts`, `packages/core/src/gpu/GpuDevice.ts`), and the implementation choices made from them, `paths(facts)` (`packages/core/src/profile/paths.ts`). Render code reads the choice and never the fact.
- **What it is for.** Subgroup and matrix fast paths behind a capability check, and any later feature's choice: each is a new entry in `PATHS`, taken where the fact holds, with a fallback that needs nothing.
- **Its bypass test.** `test/deviceFactsSeam.test.ts`, "finds no read outside the device and profile layers". It scans `packages/core/src/**/*.ts` outside `src/gpu/`, `src/profile/` and the protocol table for reads of the device's features, the adapter's info, the capabilities, the limits and the facts. The inspector in `packages/ui/src/` is outside the scan by design.
- **Its neighbor.** `test/paths.test.ts` is not a bypass test. It checks that every choice is taken on some persona ("takes every choice on some persona, so none is dead"), that every path ends in a choice that needs nothing, that `paths(facts)` matches what the engine chose from capabilities, and that the engine builds with the chosen paths.

### 9. The renderer seam

- **What goes through it.** What the scene's holders reach of a renderer: a device per engine (`RenderDevice`), a mirror per world (`WorldMirror`) and a renderer per view (`ViewRenderer`), in `packages/core/src/scene/renderSeam.ts`. WebGPU is the first implementation (`packages/core/src/render/webgpuDevice.ts`). The scene's neutral draw data is `WorldDraws`.
- **What replaces it.** A second device (`src/webgl2/`, CS-35) implements the interfaces. A path-tracer view is another `ViewRenderer` on the same device.
- **Its tests**, in `test/importBoundary.test.ts`:
  - "the engine, worlds and views reach the WebGPU renderer only through the seam, and named edges": `Engine.ts`, `World.ts` and `View.ts` may import the renderer or the GPU layer only along the thirteen edges of `SEAM_EDGES`, each with its reason. A "type:" entry must stay type-only. A stale entry fails.
  - "scene data doesn't import rasterizer data" and "the observer's settings, a stage's definition and the sky pack's format hold no GPU types".
  - The tiers: "content imports no renderer, GPU types or the classes holding them, but for its named exceptions" (eight named exceptions), "content never reads a world's rasterizer data or an engine's GPU context", "only the renderer and World import the draw bundles", "the GPU layer imports nothing above it, but for the environment kernel" and "the renderer reaches content only where named".
  - The `webgl2` tier: "the webgl2 tier imports only the scene, the utilities and itself", "the webgl2 tier names no WebGPU type", and "no other tier imports the webgl2 tier, but the engine's device choice, dynamically". `packages/core/src/webgl2` does not exist at this commit, so these pass over zero files. "refuses a webgl2 file that imports the WebGPU renderer…" shows the detector bites.

## How the tests were checked

Before any plant, the six test files ran green: `npx vitest run test/seams.test.ts test/bindless.test.ts test/deviceFactsSeam.test.ts test/paths.test.ts test/importBoundary.test.ts test/acceleration.test.ts`, six files and 64 tests. For each plant below, one line or one small function was added to the file named, the test file named was run, and the file was restored. No planted line is committed.

| Seam and test | Plant | Failure |
| --- | --- | --- |
| Per-draw constants, "writes draw records only in src/render/drawConstants.ts" | `w.recordsU32[0] = 1;` in a new function at the end of `src/scene/World.ts` | `expected [ 'src/scene/World.ts:2109' ] to deeply equal []` |
| Per-draw constants, "reads draw records in Slang only through drawRecord" | `return records[i].flags;` in a new function at the end of `src/shaders/cullTables.slang` | `src/shaders/cullTables.slang:244 reads records[` |
| Per-draw constants, "writes the records' GPU table only through the seam" | `queue.writeBuffer(recordBuffer, 0, d)` in `src/scene/World.ts` | `src/scene/World.ts:2110` |
| Placements, "is read in Slang only through placement.slang's placementRow" | `return placements[at].xyz;` at the end of `src/shaders/surface.slang` | `src/shaders/surface.slang:3223 reads placements[` |
| Placements, "is written only by src/scene/placementTable.ts" | `queue.writeBuffer(placementBuffer, 0, d)` in `src/scene/World.ts` | `src/scene/World.ts:2110` |
| Draw arguments, "issues indexed and indirect draws only in src/render/drawArguments.ts" | `pass.drawIndexed(3);` in `src/scene/World.ts` | `src/scene/World.ts:2109` |
| Draw arguments, "reaches draw arguments in Slang only through cullTables' accessors" | `args[0].store(1u);` in `src/shaders/cull.slang` | `src/shaders/cull.slang:306 indexes args[` |
| Draw arguments, `slotOf` | `+ 4` on the offset of the non-retest `drawIndexedIndirect` in `src/render/drawArguments.ts` | `expected [ 4, 24, 44 ] to deeply equal [ +0, 20, 40 ]` |
| Geometry submission, "binds vertex and index buffers only on the submission path" | `pass.setVertexBuffer(0, b);` in a function in `src/scene/World.ts` | `expected [ 'src/scene/World.ts: plantedBind' ] to deeply equal []` |
| Rays, "examples and measure reach rays only through the query interface" | `import { castTerrainRay } from "@cesium/next"; void castTerrainRay;` in `examples/clipping/picks.ts` | `examples/clipping/picks.ts:232` and `:233` "reaches rays around src/query" |
| Rays, retained geometry | `void tile.geometry;` on a `Tile` in `examples/refinement.ts` | `examples/refinement.ts:139 reads a tileset's retained geometry (rays go through src/query; …)` |
| Bindless, "reads material textures only through materialTexture" | `baseColorTexture.Sample(baseColorSampler, uv)` in a new function at the end of `src/shaders/surface.slang` | `expected [ 3223 ] to deeply equal []` |
| Acceleration hook | The `world.acceleration.drawRemoved(handle)` call removed from `removeDraw` in `src/scene/world/draws.ts` | "sees every draw added and removed by the world": `expected [ 'added 0:0', 'added 1:0' ] to deeply equal [ …(4) ]`; "sees every tile placed and unloaded…": `expected -1 to be greater than 24` |
| Capability registry, "finds no read outside the device and profile layers" | `plantedDevice.features.has("subgroups")` in `src/scene/World.ts` | `src/scene/World.ts:2109 reads the device's features: …` |
| Paths, "takes every choice on some persona, so none is dead" | a `planted` choice that needs `subgroups`, added to the `gpuTiming` path in `src/profile/paths.ts` | `gpuTiming:planted: expected false to be true` |
| Renderer seam, the holders' edges | `import { OCCLUSION_COUNTERS } from "../render/drawArguments.ts";` in `src/scene/View.ts` | `src/scene/View.ts → src/render/drawArguments.ts` |
| Renderer seam, a "type:" edge | `import { PATCH_CHUNK_CELLS } from "../render/layout.ts";` (a value) in `src/scene/View.ts` | `src/scene/View.ts → src/render/layout.ts` |
| Content tier | `import { RECORD_WORDS } from "../render/layout.ts";` in `src/streaming/Tile.ts` | `src/streaming/Tile.ts → src/render/layout.ts` |
| `webgl2` tier | a new `src/webgl2/planted.ts` that imports `../render/layout.ts` and declares `let device: GPUDevice` | "imports only the scene…": `src/webgl2/planted.ts:1 → src/render/layout.ts`; "names no WebGPU type": `src/webgl2/planted.ts:3 GPUDevice` |

Not planted: "the query interface's backends are where rays are reached" (a positive control that needs the backends to stop calling rays), "packs texture references two to a word" (a layout test), and the `paths.test.ts` tests other than the dead-choice one. They check what is there, not a bypass.

## Where the tests do not reach

Each of these was planted and passed, or is visible in the code and shown by a test fixture. None is a failure of a test that exists. Each is a place where a seam's purpose reaches further than its test.

| Hole | Evidence |
| --- | --- |
| **The renderer seam's "names no GPU type" is not pinned.** `renderSeam.ts` has no `GPU…` name in its text, but `RenderTick.targets` holds `RenderTarget` (`packages/core/src/scene/renderTarget.ts`, which has `GPUDevice`, `GPUTexture` and `GPUCanvasContext` in its signatures), and `RenderDevice.facts` is `DeviceFacts`, whose `renderer` is the literal `"webgpu"`. | Plant: `export let plantedDevice: GPUDevice \| undefined;` in `src/scene/renderSeam.ts` passed all 29 tests in `importBoundary.test.ts`. |
| **Only three scene files are held to the seam.** `SEAM_EDGES` covers `Engine.ts`, `World.ts` and `View.ts`. At the base commit, 40 of the 101 files under `packages/core/src/scene` import `src/render/` or `src/gpu/`, and 21 name a `GPU…` type. | Plant: `import { RECORD_WORDS } from "../render/layout.ts";` in `src/scene/Camera.ts` passed. The layers note already says the seams "aren't a boundary between the renderer and the scene" (`docs/design/layers-engine-renderer-backend.md`). |
| **The ray scan has a scope.** It reads `examples/` and `src/measure/` only. `packages/ui/src/`, `parity/`, `lab/`, `bench/`, `spikes/`, `demo/` and `standalone/` are outside it. `parity/heights.ts:245` and `parity/tracks.ts:159` call `world.castRays` today. | Plant: `import { castTerrainRay } from "@cesium/next";` in `widgets/index.ts` passed. |
| **Rays inside `src/` do not go through the interface.** `World.castRays` is called by `packages/core/src/scene/HeightClamping.ts:468` and `packages/core/src/scene/heightCaptures.ts:102`, and the pick pass (`packages/core/src/render/view/picks.ts`) reads `Globe` for its rays. The seam says "examples and measure" and means it, so these are outside it. A hardware engine would not change their answers unless they move. | Read in the code at the base commit; the scan's roots are in `seams.test.ts`, "the ray seam". |
| **Property textures bypass the bindless seam.** `propertyTexture0` and `propertyTexture1` (group 2, bindings 20 and 21 in `surface.slang`) are read with `Load` at `surface.slang:603` to `609`, outside `materialTexture`. The detector knows five names. | Plant: `return propertyTexture0.Load(int3(p, 0));` at the end of `surface.slang` passed `bindless.test.ts`. The real reads at lines 603 to 609 pass too. |
| **The capability detector uses hand lists.** `CAPABILITY_FIELDS` and `LIMIT_NAMES` in `deviceFactsSeam.test.ts` name today's fields and limits. A field added later is invisible until someone adds it to the list. | Plant: `caps.cooperativeMatrix` in `src/scene/World.ts` passed. |
| **Plain `draw(` is not a content draw to the geometry test.** | The fixture in "content draws and buffer binds" asserts `pass.draw(3)` is not flagged. |

## The seams still missing

The spec's section 7.10 lists what 5a lays and what it leaves to this audit. Against the code, these are the gaps. "Cost today" counts files and kinds of change, not time.

### 1. Property textures behind an accessor (bindless)

- **Carries.** The two property textures' reads, so a resource table covers every group-2 texture.
- **Cost today.** One Slang function around the two `Load` calls in `packages/core/src/shaders/surface.slang`, and the five names in the detector of `test/bindless.test.ts` gain two. Nothing changes at run time: the function is inlined.
- **The rule.** Passes. It costs nothing in the current path.

### 2. Refit and a per-tick event in the acceleration hook

- **Carries.** A per-tick top-level structure needs to know that transforms, instances or records changed. The hook has four events and none for that. The spec says "build, refit, evict" and "a per-tick top-level one".
- **Cost today.** One optional method on `AccelerationStructures` (`packages/core/src/streaming/acceleration.ts`), called once a tick with a default that does nothing. The changed rows are already logged: `WorldDraws` keeps change logs for records, transforms, instances and materials that a device drains (`packages/core/src/scene/world/worldDraws.ts`, `CpuTable.mark`), so the method can hand the same log to a structure builder. No call site in the draw paths changes. Adding the method to the exported interface is a public change, which is why it goes to the review.
- **The rule.** Passes: one call a tick, and no new write on any draw path. A per-draw "moved" event would fail it: it would add a call at every transform and instance write.

### 3. Cluster (meshlet) data in the content format

- **Carries.** The spec says "the content pipeline may carry meshlet or cluster data". `MeshData` (`packages/core/src/scene/meshes.ts`) holds positions, normals, uvs, colors, tangents, indices, feature IDs and named extra attributes. Nothing carries clusters. A cluster range belongs to a mesh, so it can live on the batch row or the mesh handle, not in the record.
- **Cost today.** An optional field on `MeshData`; its reading in `packages/core/src/io` (the worker's glTF path) and its upload with the slabs (`packages/core/src/scene/world/meshes.ts`); a batch field; and a compute culling kernel that reads it. Only the field and its upload are in the seam. The kernel is CS-352.
- **The rule.** Passes on cost: an optional field nothing reads costs nothing in the current path, and keeping the range off the record means a record gains no word. It does not pass on format: the shape of a cluster (size, cone, bounds, the build tool's output) is a format others would write, and nothing today says what it is. A guess here is a one-way door. Recommendation: leave it missing until CS-352 settles the format, and do not add a placeholder field.

### 4. Picks through the query interface

- **Carries.** The spec lists picking among the queries that go through the one interface. Today a pick is an ID-buffer read from the pick pass (`packages/core/src/render/view/picks.ts`, `CorePick`). Only the ray part of snapping and height queries goes through `SpatialQueries`.
- **Cost today.** Routing picks through a ray query would replace the pick pass, which reads one pixel from a buffer the view already drew, with a ray batch that a draw backend answers by brute force today.
- **The rule.** Fails: it is a design compromise in the current WebGPU path, a slower answer for the common pick. Recommendation: leave the pick pass as it is, and have the review say plainly that picking is a renderer path with a ray fallback, not a ray query.

### 5. Per-pass and per-dispatch constants (immediates beyond per-draw)

- **Carries.** Per-draw constants are in place. Constant blocks that a pass or a dispatch binds as a uniform buffer are not behind a seam: `packages/core/src/shaders` binds 41 `ConstantBuffer<…>` blocks, each filled by the pass or dispatch that uses it.
- **Cost today.** One wrapper at each of those fills and at each declaration, so a later immediates backend swaps one place. Every hot pass gains a layer for a feature whose size limit and shape (the detector already names `maxImmediateSize`) are not final.
- **The rule.** Fails today. It touches many files and adds indirection to passes with no consumer. CS-355 ("where measured to win") is the right gate. Recommendation: no seam now; CS-355 measures first.

### 6. Queue affinity and buffer dependencies in the pass graph

- **Carries.** The spec says "the job graph marks each pass's queue affinity and dependencies now". `FrameGraph` (`packages/core/src/render/FrameGraph.ts`) declares texture reads and writes and a `sideEffect` flag. It has no queue field, and buffers are not tracked: a pass that only touches buffers is kept by `sideEffect: true`. The CPU job system (`packages/core/src/io/Jobs.ts`) has dependencies and a worker pool, and no notion of a GPU queue.
- **Cost today.** An optional `queue` field is free. Using it safely needs buffer reads and writes declared on each pass: there are 30 `addPass` calls in `packages/core/src/render`, each a declaration to write and keep right, with no checker to say one is missing.
- **The rule.** Does not pass yet. The field costs nothing at run time. But a wrong declaration would be silent without a checker, and WebGPU exposes one queue (`device.queue`) today, so nothing would use the field. Recommendation: wait for a second queue (no item in `work/` tracks it), then add the field and the checker together.

### The spec's other items

- **Subgroup and matrix fast paths behind a capability check.** The registry is the seam. `subgroups` and `shaderF16` are already capabilities, and no Slang module uses subgroups today. A matrix feature is not in `OPTIONAL_FEATURES` (`packages/core/src/gpu/GpuDevice.ts`). A new fast path is one `PATHS` entry, one feature in that list and one `Capabilities` field, all at no cost until a kernel exists. The only gap is the detector's hand lists (see above).
- **64-bit atomics.** Same: a feature entry and a path when the feature exists. The visibility buffer (CS-354) is a pass choice, not a seam.
- **Slang per capability.** In place by absence: no `.slang` file has `#if`, `__target_switch` or `[require`. Variants use specialization constants (`cutOutInDepth`, `clipsOn` in `surface.slang`). A new stage adds a module through the linker (`packages/core/src/shaders/link/`). A test that pins "no capability branch in Slang" would be one more scan and costs nothing.
- **Other features in CS-351's list.** View instancing (WebXR) and texel buffers are not in the owner's input or in section 7.10. No seam is proposed for them.

## Proposals for the review

These go to CS-102 as proposals. The owner decides them in CS-438. Each says what it breaks.

1. **Pin the ray seam's scope.** Widen the scan to `widgets/`, `parity/`, `lab/`, `bench/`, `spikes/`, `demo/` and `standalone/`, and list the internal callers (`HeightClamping.ts`, `heightCaptures.ts`, the pick pass) in an allowlist with a reason each, as `RETAINED_NOT_FOR_RAYS` does. Breaks: the two parity pages' `world.castRays` calls must move behind `Engine.queries` or be listed.
2. **Demote the ray internals.** `castTerrainRay` is still a public export (`api/surface.txt`), and `World.castRays` and a tileset's `terrainRayTarget` are public members. The spec's list for 5i already names `castTerrainRay`. With the seam in place, the examples do not need any of them.
3. **Close the renderer seam's text check now, and its type check after CS-35.** Add `src/scene/renderSeam.ts` to the "hold no GPU types" file list's text check (no `GPU…` name). Its imports of `DeviceFacts` and `RenderTarget` fail the import part of that test until both are neutral. That is CS-35's work, so the import part waits for it.
4. **Hold the other scene files to a stated rule.** Either list the scene files allowed to import the renderer, as `SEAM_EDGES` does for three, or say in the review that the scene tier still holds GPU types and name the plan that moves them.
5. **Extend the bindless detector to property textures** with the accessor from "The seams still missing", item 1.
6. **Derive the capability detector's lists from the types** (`keyof Capabilities`, the names in `GPUSupportedLimits`), so a new field cannot be added without the test seeing it. A test change only.
7. **Turn the hook's test into a bypass test too:** a scan that `DrawConstants.write` is called only in `addDraw`, and that `tileUnloaded` is called only where a tile's content unloads. Test only.
8. **Add the per-tick event to the acceleration hook** (item 2 above). A change to an exported interface, with no implementer outside the tests.
9. **Leave three seams missing on purpose** and have the review say so: picks as ray queries, per-pass immediates, and queue affinity. Each fails the rule today. Cluster data in the content format waits for CS-352's format.

## Not seams of this kind

These tests scan sources too and sit beside the seam tests. They guard other things, and they are not on the list.

- `test/noSceneGains.test.ts`: nothing derived from an observer reaches a scene or sky shader but pre-exposure and the stars' point spread.
- `test/styleNoSlang.test.ts` and `test/importCycles.test.ts`: what loads the Slang compiler, and cycles among value imports.
- `test/threadProtocol.test.ts`: the worker façade's protocol table against the code (CS-567). The entry-point layering in `importBoundary.test.ts` (core, `/time`, `/frames`, `/proj`, `/measure`, `/widgets`) is the same kind of boundary, and is not a WebGPU seam.
