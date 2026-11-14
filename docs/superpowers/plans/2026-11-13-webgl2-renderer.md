# A WebGL 2 renderer behind the same scene: plan

**Status (2026-11-13):** planned, nothing built. The owner reviewed it on the same day. The answers from planning and from the review are in section 9.

**Goal:** a second, simpler renderer in the PoC that draws the same `Engine`, `World` and `View` with WebGL 2. Its job is to exercise the renderer seam. WebGL 2 has no compute shaders, no storage buffers and no indirect draws, so this is a different renderer, not a translation of the GPU-driven one.

**Sources:**

- CESIUM2_WEBGPU_PLAN.md §13.17 (layers: engine, renderer, GPU backend) and §13.41, especially "Swappable and hybrid renderers", its decisions of 2026-11-13, and "Architecture decisions from the 2026-11-13 discussion".
- `docs/superpowers/plans/2026-11-12-transform-graph.md` (routes, the IR, centre constants, fitted lattices).
- CESIUM2_WEBGPU_PLAN.md §13.42, "The core IR", and its owner's decisions: Cesium IR (`cesium-ir`).
- The Cesium IR implementation plan (`docs/superpowers/plans/2026-11-13-cesium-ir.md`, reviewed 2026-11-13). W7 and W8 depend on its milestones by name.
- The engine profiles plan (`docs/superpowers/plans/2026-11-13-engine-profiles.md`): facts, paths, support reports, personas. This plan uses its terms and fills its M8.
- Code facts are from a read-only survey of `packages/next` on this date. File references are under `packages/next/`.

**Decisions in force:**

- The seam is a renderer behind each view, not a GPU backend.
- Each view reports what it supports, in the scene's terms (`view.support`). An unmet request warns once and falls back as documented; `strict` throws.
- Outputs are named as AOVs.
- `GpuDevice`, `Capabilities` and `LimitsTier` move to `@cesium/next/gpu`.
- Every renderer draws the globe, terrain, imagery and meshes (3D Tiles, glTF). Vectors and labels, points and splats, b-rep patches and advanced translucency are optional and declared.
- Hardware- and browser-specific paths appear only in the support report and the inspector, and they're detected automatically.
- One main-thread API runs the engine on the main thread or in a worker. The probe that detects WebGPU in a worker serves `"webgl2"` too.
- Styling stays compiler-free (no Slang).
- **The core IR is Cesium IR (§13.42):** `KHR_interactivity`'s math and type vocabulary, a versioned JSON form (`cesium-ir/<major>.<minor>`), GLSL ES 3.00 and WGSL emitters, and tables with a bounded search. WGSL is a front end, lowered through naga into Cesium IR. It isn't an escape hatch: raw WGSL that bypasses the IR is not offered.
- **From planning and review (section 9):**
  - A device per engine, with a renderer per view inside it.
  - Styles, warps and user code reach GLSL ES only through Cesium IR's emitter.
  - naga runs at build time for the engine's shaders, from our own crate unless it's far larger than the published naga-wasm.
  - Parity tolerances are tiered.
  - Without `EXT_clip_control`, depth falls back to logarithmic depth.
  - "auto" falls back to WebGL 2 with a warning.
  - No time estimates: milestones state dependencies, order and "done when".

> **Job system (owner, 2026-11-13):** the CPU work this renderer adds runs as jobs, not ad-hoc workers or budgets: lattice fits, light binning and the naga translation of user code. Per-draw culling stays on the engine thread. See CESIUM2_WEBGPU_PLAN.md §13.43 and §6 M8.

## 1. Scope

### What it draws, in order

| Content | Required? | WebGL 2 renderer | Milestone |
| --- | --- | --- | --- |
| glTF models (meshes, PBR metallic-roughness, textures, alpha mask) | Required | Yes | W4 (unlit), W6 (lit) |
| 3D Tiles meshes (b3dm, glb, i3dm) | Required | Yes, instanced through per-instance attributes | W4, W6 |
| Globe: ellipsoid and quantized-mesh terrain, skirts, upsampled quadrants | Required | Yes | W5 |
| Globe imagery (slices of a texture array, ancestor fallback, fades) | Required | Yes, composited by fragment passes | W5 |
| Billboards (pins) | Not listed | Yes: a quad per instance | W6 |
| Styles (`FeatureStyle`: `show`, `color`) | Not a content kind | Yes, through Cesium IR's GLSL ES emitter | W7 |
| Warped content (compiled routes, fitted lattices) | Not a content kind | Yes | W7 |
| B-reps through CPU tessellation (plan 4b's render form) | Meshes | Yes: they're meshes | W6 |
| B-rep patches diced on the GPU | Optional | No: declared unsupported | – |
| Vectors and labels | Optional | No in the PoC | – |
| Points and splats | Optional | No in the PoC | – |
| Advanced translucency (exact per-pixel lists) | Optional | No. Moments where float blending allows it (W10) | – |

### Features, as steps in the profiles catalog

| Feature | Steps the WebGL 2 renderer offers | When |
| --- | --- | --- |
| Background | `color` first, then `atmosphere` | W4, W9 |
| `aerialPerspective`, `sunDisk` | `on` | W9 |
| Lighting | Sun and a fixed ambient term, then image-based light from the atmosphere | W6, W9 |
| `shadows` | `full` (cascaded shadow maps are plain raster work) | W10 |
| `ambientOcclusion` | `full` as a fragment pass | W10 |
| `translucency` | Per-draw ordering first (1.x's way), then `moments16`, and `moments32` with `EXT_float_blend` | W6, W10 |
| `fxaa` | `on` (already a fragment pass) | W10 |
| `glare` | None in the PoC (compute) | – |
| `lodTransitions` | `morph`, `pop` (the vertex stage reads the morph start) | W5 |
| `cityLights` | None in the PoC | – |
| Clips (boxes, terrain regions) | Yes, from data textures | W10 |
| Automatic exposure and the eye | Average luminance from a downsample chain; the eye's local adaptation later | W9 |

### What `view.support` says

The report has the same shape as WebGPU's (the profiles plan, section 6). For a WebGL 2 view at the end of W9:

- `renderer: "webgl2"`.
- `content`: `meshes`, `instanced`, `billboards`, `terrain`, `imagery`, `sky`. Not listed: `patches`, `points`, `vectors`.
- `features`: the steps in the table above. Everything else is `off`, with the rule that says why ("needs compute", "needs storage buffers").
- `outputs`: `color`, `displayColor`, `depth`, and `ids` on demand (section 5).
- `queries`: picks from the renderer's ID pass. `castRays` and `standing` from the CPU backends only (terrain, retained tileset geometry, ellipsoids, the frame tree). The draws backend (`raycast.slang`, GPU compute) is listed as absent.
- `updates: "tick"`.
- `paths`: diagnostic strings, such as `depth: reversed-z (EXT_clip_control)` or `depth: log (no EXT_clip_control)`, `draws: multi-draw` or `draws: one call per record`, and the KTX2 transcode target.

## 2. Architecture

### Two levels: a device per engine, a renderer per view

WebGPU and WebGL 2 share no GPU resources. Only images cross between them, and only by copy: WebGPU's `copyExternalImageToTexture` reads a WebGL canvas, an `OffscreenCanvas` or an `ImageBitmap`, and WebGL's `texImage2D` reads a WebGPU canvas. Buffers can't cross at all. A zero-copy canvas import was discussed in gpuweb ([issue #1670](https://github.com/gpuweb/gpuweb/issues/1670), undated), but nothing shipped was found on 2026-11-13. So the choice has two levels:

- **A device per engine.** The device is where GPU resources live: a WebGPU device or a WebGL 2 context. `Engine.create({ renderer })` picks it once.
- **A renderer per view, inside that device.** Renderers on one device share its resources. A WebGPU raster view beside a WebGPU path tracer would read the same arena, material and texture tables, imagery slices and later the BVH. Only the views' targets differ.
- **The WebGL 2 device has one renderer,** the one this plan builds. It owns its own copy of every GPU resource.
- **Mixed engines** (a WebGPU view and a WebGL 2 view in one engine) wait until they're needed (owner, 2026-11-13). They would upload all content twice. The parity tests run two engines over the same data instead.

The types stay per view (`view.support` names the view's renderer), so mixed engines and a path-tracer view need no API change later.

**The WebGPU side has a dependency of its own.** For a path tracer to share the WebGPU raster renderer's tables, the device's tables (the arena, materials, texture sets, imagery slices) have to split from the raster passes. That isn't on this plan's critical path, but W1's extraction should leave room for it.

### Where it sits

| Layer (§13.17) | WebGPU today | WebGL 2 |
| --- | --- | --- |
| Content | `src/streaming`, `src/globe`, `src/tiles`, through `DrawSink` and `TilesetHost` | Unchanged |
| Scene | `WorldScene`, `EngineScene`, `ViewAnchorState`, the loop, selection, queries | Unchanged, plus the neutral draw tables below |
| Renderer | `src/render/`, `src/shaders/`, `WorldRaster`, `EngineRaster` | `src/webgl2/`: `WorldGl`, `EngineGl`, the passes, GLSL ES |
| Device | `src/gpu/` | `src/webgl2/device/`: the context, its facts, readbacks, timers |

`test/importBoundary.test.ts` gets a fifth core tier, `webgl2`, for `src/webgl2/`:

- `webgl2` may import scene and utilities. It may not import `src/render/`, `src/gpu/` or any WebGPU type.
- No other tier imports `webgl2`, except the device choice in `Engine` through a dynamic `import()`, so WebGPU users never load it. `scripts/checkBundle.mjs` guards that it's a separate chunk, as it guards the Slang compiler today.
- A test scans `src/webgl2/` for `GPU[A-Z]` type names, as the observer test does today.

### What the scene half must expose

Today a second renderer couldn't draw anything: the data it needs lives in the raster half or in GPU objects. The survey found these:

| Data | Today | Renderer-neutral home |
| --- | --- | --- |
| Draw records (bounds, colour, material, transform, flags, feature base, imagery slice, view mask, clip block, placement, instances, morph) | `WorldRaster.drawConstants`: CPU words with a GPU mirror. The words are already neutral | The CPU words move to a scene-tier `WorldDraws`, with a change log (dirty slots) that each renderer drains. `DrawConstants` stays the only writer (the seam) |
| Batches (mesh, material, texture set, double-sided, shader, route variant, kind) | `WorldRaster.batches`; `Batch.chunks` is a `GPUBuffer` | The key fields move to `WorldDraws`; GPU fields stay in each renderer's batch state |
| Transforms and instances | `MirroredTable` in `WorldRaster`: float64 CPU tables with GPU mirrors | The CPU tables move to the scene; each renderer mirrors them |
| Materials | `WorldRaster.materialsF32` and `materialsU32` | CPU arrays to the scene; slots already live in `WorldScene` |
| Placements and warp terms | `WorldScene.drawPlacements` (neutral); `WorldRaster.placementTable` (GPU) | The table's CPU contents to the scene |
| Mesh geometry | `MeshHandle.slab`: bytes written to GPU slabs when added | `MeshData` kept on the CPU until every device has uploaded it, then dropped. A device keeps its own placement in its own slabs |
| Textures | Content makes GPU textures (`gltfModel.ts`); `TextureBinding` holds a `GPUTextureView` and `GPUSampler` | A neutral texture source: image data or compressed levels, and a sampler description. The device uploads it. `TextureBinding` moves behind the device |
| Imagery slices | `GlobeImagery` composites with compute into `SlicePool`'s texture array: content holding GPU code (a named exception in the boundary test) | The level choice, the float64 row mapping and LRU stay in content. The composite moves behind an `ImageryCompositor` interface, with WebGPU (compute) and WebGL 2 (fragment) implementations. The three exceptions in `TIER_EXCEPTIONS` go away |
| Per-view state (camera, anchors' eyes, parameters, selection results, view masks) | Scene, mostly | Unchanged |

This is §13.17's "what to do when" made concrete. That section said not to write an abstract `Renderer` with one implementation. A second renderer is now chosen, so W1 writes the interfaces with WebGPU as the first implementation, as pure moves.

### The interfaces (sketch, settled in W1)

```ts
/** One per engine: a WebGPU device or a WebGL 2 context. */
interface RenderDevice {
  readonly kind: "webgpu" | "webgl2";
  readonly facts: DeviceFacts;               // the profiles plan's, under the device's own names
  createWorld(scene: WorldScene, draws: WorldDraws): WorldMirror;
  createRenderer(view: View): ViewRenderer;  // one kind per device today
  readonly imagery: ImageryCompositor;
  destroy(): void;
}

/** A device's copy of a world: drains the change log once per tick. */
interface WorldMirror {
  sync(): void;
  memory(): WorldMemory;
}

/** What draws one view. */
interface ViewRenderer {
  readonly support: SupportReport;
  render(tick: TickState): void;
  pick(request: PickRequest): Promise<PickResult>;
  output(name: AovName): AovHandle | undefined;
}
```

## 3. CPU-side work that replaces GPU-driven work

### Culling and level of detail

- **Selection already runs on the CPU,** including the horizon occluder behind the `Occluder` interface. The WebGL 2 renderer uses its results as they are. The selected tiles must be identical in both renderers (section 7).
- **Per-draw culling** runs on the CPU over the records' bounds (centre and radius words), the view mask and the shown flag, per view per tick. This replaces `cull.slang`. A few thousand draws is a short loop, and it's timed in the inspector.
- **No occlusion culling.** The depth pyramid (`hzb.slang`, `occlusionQuery.slang`) needs compute. The horizon occluder in selection covers the large case.
- **Instances:** per-instance range culling (`visibleWithin`, `visibleBeyond`) runs on the CPU into a compacted per-view instance buffer, only for instanced draws with ranges. Others draw all instances.

### Submitting draws

- **Per-draw data** lives in data textures, not uniforms: records, materials and transforms as `RGBA32UI` and `RGBA32F` textures, read with `texelFetch` by draw index. WebGL 2 guarantees 16 vertex texture units, and uniform blocks can be as small as 16 KB. The draw index comes from `gl_DrawID` with `WEBGL_multi_draw`, else from a uniform set per call.
- **Precision:** the CPU computes each visible draw's model-view matrix in float64 relative to the eye, per view per tick, and writes it as float32. 1.x does the same. This replaces the hi/lo split in the shader.
- **Draw calls:** one `drawElements` per visible record, grouped by batch (program, textures, state). With `WEBGL_multi_draw`, one `multiDrawElements` per batch. This is a path, reported in `support.paths`.
- **Vertex data:** each device mirrors the slabs as WebGL buffers. A vertex array object per mesh layout points attributes at the mesh's streams by byte offset. Normalized and integer formats map onto `vertexAttribPointer` and `vertexAttribIPointer`. Anything without a fixed-function form (oct-encoded normals, for example) decodes in the shader, as it does today.
- **Feature tables and property textures** (what styles read) go to an arena data texture with the same directory, so `readFragmentProperty` becomes a `texelFetch`.

### Warps

- **Compiled routes:** the transform graph lowers to Cesium IR, and Cesium IR's GLSL ES emitter writes the vertex stage's fused `transformPoint` (section 4). Table-driven warps, such as the corridor, compile to a fixed program over a table. WebGL 2 holds the table as a std140 uniform block of vec4s; §13.42 measured that compiling and linking in WebGL 2.
- **Centre constants** are computed on the CPU in float64 per draw, by Cesium IR's evaluator (the conformant one). This replaces the df64 compute pass (`warpFitDirect.slang`) for parameters that don't separate. Parameters that enter linearly stay per-view uniforms.
- **Fitted lattices** go into float textures (`RGBA32F`, `texelFetch` with trilinear filtering in the shader, since float textures filter only with `OES_texture_float_linear`). The fits already have a CPU implementation (`fitLattice` in `src/scene/warpFit.ts`), which the WebGL 2 device uses in place of `warpFitGpu.slang`.
- **Height-normal terrain** (`setDrawHeightNormal`) reads the per-vertex `h·n̂` attribute as WebGPU's vertex stage does.

### Depth

- **Reversed-Z with a float depth buffer where `EXT_clip_control` exists.** It sets clip-space depth to 0 to 1, and an infinite far plane works as it does on WebGPU. Chrome reports it widely ([web3dsurvey](https://web3dsurvey.com/webgl/extensions/EXT_clip_control), undated). ANGLE turns it off on some Mali GPUs.
- **Elsewhere, logarithmic depth written per fragment,** as 1.x does (owner, 2026-11-13). Writing `gl_FragDepth` costs early depth testing. A Mozilla bug ([1908745](https://bugzilla.mozilla.org/show_bug.cgi?id=1908745)) lists the extension as missing in Firefox on Windows, so this path matters for exactly the browsers WebGL 2 is for. No Safari data was found. The probe decides at run time, and the path shows in `support.paths`.
- **Depth-equal shading:** the PoC has no depth prepass. Opaque draws go front to back with an ordinary depth test, so `invariant gl_Position` isn't needed until a prepass is added.

### MSAA

- 4× multisampled renderbuffers for HDR colour (`RGBA16F`, which needs `EXT_color_buffer_float`), display colour and depth, resolved with `blitFramebuffer`.
- **Feature IDs can't be multisampled:** OpenGL ES 3.0 refuses integer formats with samples above zero, and all of a framebuffer's attachments share one sample count. So IDs come from a separate single-sampled pass on demand (section 5).

### The compute kernels, one by one

| Kernels (`src/**/*.slang`) | WebGL 2 |
| --- | --- |
| `cull` (3) | CPU culling, above |
| `scatter` (1): sparse table uploads | `texSubImage2D` of changed rows |
| `imagery` (3) | Fragment passes into the texture array's layers (`framebufferTextureLayer`), then mips |
| `atmosphere` (3), `sky` (3) | Fragment passes into 2D and 3D float textures (W9) |
| `ibl` (7) | Fragment passes into cube-map faces and mips (W9) |
| `meter` (1), `adapt` (2) | A downsample chain for average luminance; the eye's bilateral grid later |
| `depthRange` (1), for shadow cascade splits | A downsampling reduction read back one tick late (W10) |
| `ao` (2) | A fragment GTAO (W10) |
| `lights` (1): clustered light lists | Light binning on the CPU, or the nearest few lights per draw |
| `composite` (1): translucency | A fragment composite, with moments (W10) |
| `pick` (1), `pickDomain` (1) | The ID pass and an async readback (section 5) |
| `raycast` (2) | No GPU draws backend: CPU query backends only |
| `hzb` (2), `occlusionQuery` (1) | None |
| `glare` (1) | None in the PoC |
| `dice` (2), `pointCull` (3), `points` (2), `modelPool` (5) | None: patches, points and vectors are optional |
| `warpFitGpu` (3), `warpFitDirect` (3) | CPU fits and CPU centre constants |
| `boundary`, `layouts`, `transforms`, `reference`, `iblReference` | Reflection or reference only: not drawn |

### Readbacks

- WebGL 2 has no `mapAsync`. A readback is `readPixels` into a pixel-pack buffer, a `fenceSync`, a non-blocking `clientWaitSync` check each tick, then `getBufferSubData`. Picks, the depth range and the exposure meter use this. A plain `readPixels` into memory would stall the pipeline, and a test refuses it in `src/webgl2/`.

## 4. Shaders

Three kinds of code have to reach GLSL ES 3.00, each by its own route.

| Code | Route | Depends on |
| --- | --- | --- |
| Engine shaders (surfaces, terrain, imagery composite, present, atmosphere, IBL) | **Build time:** new WebGL-shaped entry points in Slang (attributes, uniform blocks, data textures, no storage buffers) that import the same pure modules (BRDF, materials, atmosphere sampling, tone curves). `slangc` writes WGSL, then naga writes GLSL ES 300. naga is our own crate, built with the approved Rust toolchain on development machines and CI (§13.42, decision 4). Rust never reaches a production build. The output is checked in as generated code, as the WGSL is today (`npm run shaders`, `shaders:check`). naga is found through `NAGA`, as `slangc` is through `SLANGC` | W0 only |
| Styles (`FeatureStyle`) and warps (compiled routes, table-driven warps) | **Run time, compiler-free:** `styleExpression.ts` and the transform graph lower to Cesium IR, and Cesium IR's GLSL ES 3.00 emitter writes the code. The WebGL 2 renderer has no emitter of its own, and `styleExpression.ts` and `codegen.ts` get no GLSL target. Uniforms are one std140 block of vec4 slots in both languages, so the slot layout and the values array are shared with WebGPU. Tables are std140 uniform blocks on WebGL 2 | IR-5 (the GLSL ES 3.00 emitter). IR-8 (styles on Cesium IR). IR-6 and IR-7 (transforms and routes on Cesium IR). IR-9 (tables and the bounded search) |
| User code: `CustomShader` hooks (WGSL, or Slang through slang-wasm) and user post stages (WGSL) | **Run time:** the user's WGSL is lowered through naga into Cesium IR. naga loads lazily, as runtime Slang does. The program then goes through the same GLSL ES emitter, and the result is linked into the WebGL entry points at their hook sites. Slang hooks go Slang → WGSL (slang-wasm, as today) → the same front end. Anything the IR can't yet express is refused with a diagnostic that names the construct. There is no whole-module naga translation at run time, and no raw WGSL that bypasses the IR, on either renderer | IR-11 (the WGSL front end). IR-13 (the API surface: hooks and post stages). For hooks that sample textures: IR-G1 (textures and samplers) (first on the gap list) |

Notes:

- **Slang has no GLSL ES target.** `slangc` 2026.21 lists GLSL profiles `glsl_150` to `glsl_460` only (checked with `slangc -h` on 2026-11-13). Hence WGSL as the hop.
- **naga's GLSL ES back end works only for vertex and fragment code** with uniforms and textures, which is why the WebGL entry points are separate. Today's surface WGSL pulls vertices from storage buffers, which GLSL ES 3.00 can't do.
- **The hook sites:** the WebGL entry points carry the same hook sites as WebGPU's. A linked program is the entry point's build-time GLSL with Cesium IR's emitted functions spliced in, so the run time never translates engine code.
- **What the gap list means here:** Cesium IR's gaps come in a fixed order (§13.42, decision 6): textures and samplers, matrices, screen-space derivatives, then noise, general bounded loops and structs. A hook that needs a later item is refused on both renderers until Cesium IR has it. The parity rows cover only hooks that Cesium IR accepts.
- **What W0 must confirm before anything depends on the build-time route:**
  - how naga handles Slang's WGSL output: uniform layouts against std140, texture and sampler pairs combined, integer textures, `invariant`;
  - the size of the generated code;
  - the size of our crate's WASM build against the published naga-wasm (30.2.0: 2,053,200 bytes, 592,380 brotli, measured in §13.42).

  Ours is chosen unless it's far larger. The same crate serves the Cesium IR plan (validation with WebGPU's capabilities, IR export), so whichever plan reaches it first builds it.
- **GPU safety rules carry over:** every loop bounded by a constant, every data-texture index clamped. Read the generated GLSL before the first browser run of a changed shader, as `scripts/dumpMsl.mjs` is read for Metal.

## 5. Outputs and post stages

- **Named outputs (AOVs):**
  - `color`: the HDR scene, `RGBA16F`, resolved from MSAA.
  - `displayColor`: unlit, display-referred colour, `RGBA8` sRGB.
  - `depth`: resolved by `blitFramebuffer` (one sample, not an average).
  - `ids`: a single-sampled `RG16UI` pass (a 32-bit ID in two halves, as on WebGPU), drawn only when something reads it. A pick scissors it to the pick's window. A post stage reading IDs draws it full screen, which costs a second geometry pass, reported in the inspector.
- **Post chain:** the same three slots (`scene`, `exposed`, `display`) as fragment passes over the resolved targets. FXAA is already a fragment pass. Glare has no WebGL 2 step in the PoC.
- **User post stages** go through Cesium IR (section 4), as hooks do. A stage whose WGSL uses compute (`POST_COMPUTE_BOUNDARY`), or anything else the IR can't express, is refused with a diagnostic.
- **Picks:** feature IDs and depth from the ID pass, read back asynchronously. `pickPosition` comes from depth and is stated with the depth buffer's accuracy at that distance. Log depth and reversed-Z give different accuracies, and both are stated. The exact hit point (WebGPU's `pickTriangle`) comes from the CPU ray backends where a tile's geometry is retained, and is otherwise the depth estimate with its accuracy.

## 6. Detection and selection

- **The option:** `Engine.create({ renderer: "auto" | "webgpu" | "webgl2" })`, default `"auto"`. Auto means WebGPU, then WebGL 2 if WebGPU is missing, with a warning once that gives the reason. Forcing one names it, and `strict` throws instead of falling back. The owner accepted this in review (section 9).
- **The probe** is the same as the thread probe's (§13.41, "Threading"). It runs where the engine will run, in the worker when worker mode is chosen:
  1. WebGPU: `navigator.gpu`, `requestAdapter()` and a throwaway `OffscreenCanvas` `"webgpu"` context.
  2. Otherwise WebGL 2: a throwaway `OffscreenCanvas` `"webgl2"` context, plus the required extension `EXT_color_buffer_float` (HDR targets). Without it there's no renderer, and `Engine.create` rejects with a message that names what's missing.
  3. The real canvas's context is taken only after the probe succeeds. A canvas can hold only one context type, and `transferControlToOffscreen()` can't be undone.
  4. The result is cached per user agent, as the thread probe's is.
- **Facts under WebGL's own names,** never mapped onto WebGPU's (the profiles plan's rule): version and renderer strings (`WEBGL_debug_renderer_info` where allowed), `MAX_TEXTURE_SIZE`, `MAX_ARRAY_TEXTURE_LAYERS`, `MAX_3D_TEXTURE_SIZE`, `MAX_UNIFORM_BLOCK_SIZE`, `MAX_VERTEX_TEXTURE_IMAGE_UNITS`, `MAX_SAMPLES`, `MAX_DRAW_BUFFERS`, and the extensions `EXT_clip_control`, `WEBGL_multi_draw`, `EXT_float_blend`, `OES_texture_float_linear`, `EXT_disjoint_timer_query_webgl2`, and the compressed formats (S3TC/BPTC, ASTC, ETC2).
- **Personas** (the profiles plan's `src/profile/personas.ts`): `webgl2-basic` (WebGL 2 minimums plus `EXT_color_buffer_float`, no clip control, no multi-draw) and `webgl2-chrome` (with both). **From R1 (accepted 2026-11-13):** add `webgl2-firefox` (no multi-draw, no clip distances, no timer query, no parallel compile), `webgl2-apple-mobile` (no float filtering or float blending, pending the W3 probe's measurement) and `webgl2-android` (no clip control, no parallel compile, a 4096 texture limit), each written once the W3 probe has measured real devices. `emulate: "webgl2-basic"` runs the WebGL 2 device with extensions hidden, for tests.
- **Context loss:** reported on `Engine.errors` with kind `device`, and the engine stops, as WebGPU device loss does today. Rebuilding from the CPU scene comes later for both devices.
- **The inspector** shows the device and why it was chosen ("WebGL 2 · WebGPU unavailable: no adapter"), the paths, the facts, and per frame: draw calls, records culled on the CPU, CPU culling time, and data-texture upload bytes. GPU time comes from `EXT_disjoint_timer_query_webgl2` where it's exposed. Elsewhere it's shown as unavailable, never as zero. The layout stays fixed whichever device runs (the inspector rules).

## 7. Testing

### Node tests

- `test/fakeGl.ts`, beside `test/fakeGpu.ts`: a WebGL 2 stand-in that records calls and state and draws nothing. Tests count draw calls, programs and texture uploads, and check the change log drains completely.
- The boundary tests from section 2, and a bundle check that the WebGL 2 chunk loads only on demand.
- Emitter agreement (WGSL against GLSL ES against the CPU evaluator) belongs to the Cesium IR plan. Here, two tests:
  - `src/webgl2/` takes its GLSL for styles, warps and user code only from Cesium IR's emitter. It builds no shader strings outside the build-time output and the hook linker.
  - A refused hook reports the same diagnostic on both renderers.
- Seam tests: records written only through `DrawConstants`, whichever device mirrors them.

### Parity against the WebGPU renderer

The oracle is the WebGPU renderer on the same machine, same engine build and same data, both pinned to the same steps (`fidelity: "fixed"` in the profiles plan). Each page takes `?renderer=webgl2`, and a runner suite `webgl2` runs each page on both devices and compares them. Tolerances (owner, 2026-11-13):

| Check | Tolerance |
| --- | --- |
| Selected tiles per camera | Identical (Jaccard 1.0). Selection is shared CPU code, so any difference is a seam bug |
| Picks | The same feature at every sampled pixel more than 1 px from an ID edge |
| `pickPosition` | Within the depth buffer's stated accuracy at that distance, which the page computes for each depth path |
| Images, unlit | FLIP mean ≤ 0.01, p95 ≤ 0.05 |
| Images, lit (sun and ambient) | FLIP mean ≤ 0.02, p95 ≤ 0.10 |
| Images, with atmosphere | FLIP mean ≤ 0.03, p95 ≤ 0.15 |

Before any threshold is used, measure WebGPU against itself over two runs, and widen a tolerance only with a stated cause. For comparison, the bar against 1.x is mean ≤ 0.05 and p95 ≤ 0.2.

### The pages

| Page | Covers | From |
| --- | --- | --- |
| `parity/models.html` (unlit sample models) | glTF, textures, alpha mask, double-sided, quantization, Draco, KTX2 | W4 |
| `parity/tileset.html` | 3D Tiles meshes, batch tables; with `TILESET_STYLES=1`, styles | W4, W7 |
| `parity/selection.html`, `parity/lod.html` | Identical selection | W4 |
| `parity/globe.html` (six cameras) | Terrain, skirts, upsampled quadrants, horizon culling | W5 |
| `parity/imagery.html` | Imagery compositing, ancestor fallback | W5 |
| `parity/customShader.html` (style rows only) | Styles. Hook rows that Cesium IR accepts, once W8's user-code half lands | W7, W8 |
| Gallery: `vertical-exaggeration` | Warps on terrain and a tileset, the height-normal path | W7 |
| Gallery: `transform-graph` | Compiled routes, fitted lattices, per-view parameters | W7 |
| Gallery: `clipping` | Clip boxes and terrain clips | W10 |
| Gallery: `brep-first-look` (CPU tessellation form only) | B-reps as meshes; patches reported as unsupported | W6 |
| `parity/translucency.html` (moments only) | `moments16` and `moments32` against WebGPU's same steps | W10 |

Not compared: `night-sky` (points, and the sky data stays local), `realtime-tracks` (vectors), `translucency` with the exact step, `slang-playground`, and `csg` (patches).

The machine is shared and overloaded: browser runs happen at the milestones' ends, one small page at a time, as AGENTS.md says.

## 8. Milestones

No time estimates: each milestone states what it needs, its order and when it's done. Model per role, as AGENTS.md says: the most capable model for design-heavy tasks and risky reviews, a fast one for well-specified work.

| # | Milestone | Model | Needs | Done when |
| --- | --- | --- | --- | --- |
| W0 | **Shader route spike** (a decision tool, per the spike rules). Our own naga crate, built with the approved Rust toolchain on development machines and CI, found through `NAGA`. Three entry points through Slang → WGSL → naga → GLSL ES 300: a minimal surface (attributes, a uniform block, a data texture), `present`, and one atmosphere table as a fragment pass. Our crate's WASM build is measured against the published naga-wasm. The page states the data, the costs and the decision asked | Opus | – | The build-time route is confirmed or replaced. Our crate is adopted, unless it's far larger than naga-wasm; then the owner decides |
| W1 | **Seam extraction, WebGPU only.** `WorldDraws` (records, batches, transforms, instances, materials, placements on the CPU, with a change log), `RenderDevice`, `WorldMirror`, `ViewRenderer`. The WebGPU renderer implements them. Pure moves: a type check per commit, the full suite and parity once at the end (the refactor rule) | Opus | – | No behaviour change. WebGPU parity suites unchanged. The boundary test has the `webgl2` tier |
| W2 | **Neutral content resources.** Texture sources in place of GPU textures in `gltfModel.ts`. `MeshData` kept until uploaded. `ImageryCompositor` with the WebGPU compute implementation moved behind it. The `GlobeImagery` exceptions removed from `TIER_EXCEPTIONS` | Opus | W1 | Same parity. Three fewer named exceptions |
| W3 | **Probe, option and an empty WebGL 2 device.** `renderer` option, the probe on both threads, facts, personas, the `webgl2` chunk loaded dynamically. Clears to the background colour; the inspector shows the device and reason. The profiles plan's M8 (support rules) lands with it | Sonnet | W1; profiles M2 | `emulate: "webgl2-basic"` makes an engine that clears. The bundle check passes |
| W4 | **First draws, unlit** (the first visible milestone). Slab mirrors, VAOs, data textures for records, materials and transforms, CPU culling, eye-relative float64 matrices, both depth paths, 4× MSAA, the present pass. glTF and 3D Tiles meshes, unlit | Opus | W0, W2, W3 | `models` and `tileset` unlit within tolerance. Selection identical |
| W5 | **Globe, terrain and imagery.** Terrain draws (skirts, upsampled clip boxes, height-normal attribute, geomorph), the fragment imagery compositor into a texture array, fades | Opus | W4 | `globe` and `imagery` within tolerance |
| W6 | **Lighting and instancing.** Sun and fixed ambient, PBR metallic-roughness, normal maps, double-sided, alpha mask, per-draw ordering for blended draws, instanced draws, billboards | Sonnet | W4 | Lit `models`, i3dm tiles, b-reps through CPU tessellation within tolerance |
| W7 | **Styles and warps through Cesium IR.** The renderer takes the GLSL ES that Cesium IR's emitter writes for styles, compiled routes and table-driven warps, and binds their uniform block and tables. Also: the arena data texture, centre constants from Cesium IR's float64 evaluator, and lattices as float textures. No GLSL target in `styleExpression.ts` or `codegen.ts` | Opus | W6. IR-5 (the GLSL ES 3.00 emitter). IR-8 (styles on Cesium IR). IR-6 and IR-7 (transforms and routes on Cesium IR). IR-9 (tables and the bounded search) | Style rows, `vertical-exaggeration` and `transform-graph` within tolerance. The test that `src/webgl2/` builds no style or warp GLSL itself passes |
| W8 | **Picks, outputs and user code.** First half, which doesn't need Cesium IR and may land first: the ID pass, async readbacks, `pickPosition`, named outputs, `view.support.outputs`. Second half: `CustomShader` hooks and user post stages. User WGSL (or Slang, through slang-wasm to WGSL) is lowered through naga into Cesium IR, emitted as GLSL ES and linked at the entry points' hook sites. Refusals carry Cesium IR's diagnostic | Opus | W4. Second half also: IR-11 (the WGSL front end). IR-13 (the API surface: hooks and post stages) | Pick parity. `customShader` hook rows within tolerance for every hook Cesium IR accepts. Refused hooks report the same diagnostic on both renderers |
| W9 | **Atmosphere.** Atmosphere and sky tables as fragment passes, the sky, aerial perspective, image-based light from it, average-luminance exposure | Opus | W6 | Default-look pages within the atmosphere tolerance |
| R1 | **Research: the browsers without WebGPU.** The share of users without WebGPU, by browser and platform, and which WebGL 2 extensions they expose: `EXT_clip_control`, `WEBGL_multi_draw`, `EXT_float_blend`, `OES_texture_float_linear`, `EXT_color_buffer_float`, `EXT_disjoint_timer_query_webgl2`, and the compressed formats. Every figure has a dated source. Feeds the handbook's compatibility tab and the personas | Sonnet | – | A dated table in this plan (or a linked note) that orders W10's steps, and the personas checked against it |
| W10 | **Further steps,** each small and separate, in R1's order (accepted 2026-11-13): FXAA, clips (`discard` as the baseline; `WEBGL_clip_cull_distance` an optional speed-up), the depth-range readback, shadows, ambient occlusion, `moments16`, then `moments32` only where `EXT_float_blend` exists. Extensions don't decide the order: nothing but `moments32` needs one beyond the floor | Sonnet | W9, R1 | Each step's page within tolerance. Each listed in the support rules |
| W11 | **The runner suite, the gallery switch and the handbook.** `node bench/run.mjs webgl2`; a renderer switch in the gallery shell; the handbook's architecture tab with the device and renderer levels and the WebGL 2 support table | Sonnet | Grows from W4 | One command runs every page in section 7 |

**Order.**

- **What R1 changes in earlier steps** (accepted 2026-11-13): W4's log-depth path (no `EXT_clip_control`) is common on Android (30%) and Linux (24%), so it gets the same parity effort as reversed-Z; W4's one-draw-per-record path is all of Firefox (no `WEBGL_multi_draw`); W5's imagery slices read `MAX_ARRAY_TEXTURE_LAYERS` (256 on some Android); W7's lattices use manual trilinear filtering by default, hardware filtering as the optimization (`OES_texture_float_linear` is 53–58% on Apple mobile); W9's float tables check `RGBA16F` accuracy or filter by hand; the W3 probe builds the actual framebuffers and checks completeness, records the reason WebGPU wasn't chosen, the unmasked renderer and ANGLE backend, a software-renderer flag and `failIfMajorPerformanceCaveat`.
- **Measuring on real devices** (R1 question 7, accepted): the W3 probe's report goes on the Dyno page, run on an iPhone on iOS 18, an Android phone with a Mali or Xclipse GPU, and Firefox on Linux or an Intel Mac. Which devices are available is still to be confirmed with the owner.
- W0 and W1 can run in parallel: different files, no shared results. R1 is reading only and can start at any point. It has to finish before W10's steps are ordered, and it's more useful before W3, where the personas are written.
- Then W2 and W3, which touch different files and can also run in parallel.
- W4 needs W0, W2 and W3.
- After W4 the work is sequential, since W5 to W9 touch the same renderer files: W5, W6, W7, then W8 and W9, then W10. W11 grows from W4 onwards.
- W7 and W8's second half also wait on the Cesium IR plan. If its milestones aren't merged when W6 ends, W8's first half and W9 go next, and W7 and the rest of W8 follow when they are.

## 9. Questions for the owner, with answers

**Answered while planning (2026-11-13):**

1. **Is the renderer chosen per engine or per view?** _Answer: a device per engine, and a renderer per view inside it._ The owner's case was a WebGPU raster view beside a WebGPU path tracer, sharing textures. That fits, since both renderers sit on one device. WebGL 2 is a device of its own with one renderer. Mixed engines can come later if needed.
2. **Is naga OK as a build tool?** _Answer: yes._
3. **Parity tolerances against WebGPU?** _Answer: tiered, as in section 7._
4. **Depth without `EXT_clip_control`?** _Answer: logarithmic depth written per fragment, as a reported path._
5. **User custom shaders and post stages on WebGL 2?** The planning answer, naga translating linked user modules at run time, was replaced in review (review answer 2 below).
6. **Styles and warps before the core IR decides?** The planning answer, GLSL ES targets in both emitters, was replaced in review (review answer 2 below).

**Answered in review (2026-11-13):**

1. **"auto"** falls back to WebGL 2 when WebGPU is missing, with a warning. The first visible milestone is unlit (W4), and lighting comes at W6.
2. **Styles, warps and user code go through Cesium IR** (replaces planning answers 5 and 6):
   - all of them reach GLSL ES through Cesium IR's emitter;
   - there are no stopgap GLSL targets in `styleExpression.ts` or `codegen.ts`;
   - linked user WGSL isn't translated as a whole module by naga;
   - user WGSL is lowered through naga into Cesium IR, and what the IR can't express is refused with a diagnostic.

   The Cesium IR implementation plan is a prerequisite. W7 and W8 name its milestones.
3. **The naga build:** W0 builds our own crate (a Rust toolchain on development machines and CI is approved, and Rust never reaches production builds) and measures it against the published naga-wasm. Ours is chosen unless it's far larger. The engine's shaders use naga at build time, as planned.
4. **Which browsers:** answered by R1 (`2026-11-13-webgl2-r1-browser-reach.md`, owner accepted all seven recommendations on 2026-11-13). **The floor:** a WebGL 2 context, `EXT_color_buffer_float`, `MAX_TEXTURE_SIZE` ≥ 4096, `MAX_SAMPLES` ≥ 4, `MAX_DRAW_BUFFERS` ≥ 4, `MAX_UNIFORM_BLOCK_SIZE` ≥ 16384, `MAX_VERTEX_TEXTURE_IMAGE_UNITS` ≥ 16, `MAX_ARRAY_TEXTURE_LAYERS` ≥ 256, and the renderer's framebuffers checked complete. No browser list. Anything else is refused with a message naming the missing item. Everything beyond the floor is a reported path with a fallback. WebGPU compatibility mode is not tried. A software renderer runs and is reported, never refused.
5. **No time estimates:** the Size column and every duration are gone. Dependencies, order and "done when" stay. Every milestone, W0 to W11, stays in scope.

**Still open:**

1. **Which browsers the WebGL 2 renderer is for:** R1 answers it.
2. **The Cesium IR plan's milestone names:** settled. The plan is merged (`docs/superpowers/plans/2026-11-13-cesium-ir.md`), and the dependencies above use its names (IR-5, IR-6, IR-7, IR-8, IR-9, IR-11, IR-13, IR-G1).
3. **When the WebGPU device splits from its raster passes,** so a path-tracer view can share them. This plan doesn't need it. It should be planned with the path tracer.

## 10. Risks

- **naga and Slang's WGSL** may disagree on layouts or features. W0 exists to find this out early. The fallback is hand-written GLSL ES for the entry points, keeping the shared modules shared through the WGSL hop where it works.
- **The Cesium IR plan is on the critical path for W7 and W8's second half.** The order in section 8 keeps the renderer moving while that plan lands. The gap list decides which hooks run, on WebGPU as well as WebGL 2, because raw WGSL isn't offered on either renderer.
- **Draw-call count:** without multi-draw, Google Photorealistic 3D Tiles or NYC-scale scenes may reach thousands of draws per view. The inspector's counters will show it. Merging tiles' draws on the CPU is a later step, not a PoC one.
- **Log depth** loses early depth testing and differs from reversed-Z at silhouettes. Its parity is checked against WebGPU with its own stated `pickPosition` accuracy.
- **Two copies of work:** every new WebGPU feature now needs a decision for WebGL 2 (a step, or a declared absence). The support rules make that decision visible. The profiles plan's invariant tests fail when a required content kind lacks an implementation.
- **Data-texture limits:** `MAX_TEXTURE_SIZE` can be as low as 2048 under WebGL 2's minimums, which caps an `RGBA32UI` table at 64 MB. Large worlds page tables across texture arrays, or report a limit notice.
