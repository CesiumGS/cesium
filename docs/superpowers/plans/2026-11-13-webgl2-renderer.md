# A WebGL 2 renderer behind the same scene: plan

**Status (2026-11-13):** planned, nothing built. The owner's answers from this planning session are in section 9.

**Goal:** a second, simpler renderer in the PoC that draws the same `Engine`, `World` and `View` with WebGL 2. Its job is to exercise the renderer seam. WebGL 2 has no compute shaders, no storage buffers and no indirect draws, so this is a different renderer, not a translation of the GPU-driven one.

**Sources:**

- CESIUM2_WEBGPU_PLAN.md §13.17 (layers: engine, renderer, GPU backend) and §13.41, especially "Swappable and hybrid renderers", its decisions of 2026-11-13, and "Architecture decisions from the 2026-11-13 discussion".
- `docs/superpowers/plans/2026-11-12-transform-graph.md` (routes, the IR, centre constants, fitted lattices).
- The engine profiles plan (branch `claude/festive-margulis-3b88c7`, `docs/superpowers/plans/2026-11-13-engine-profiles.md`): facts, paths, support reports, personas. This plan uses its terms and fills its M8.
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
- The core IR is undecided. The core IR spike compares a minimal own IR with ONNX's graph format and naga's IR. Whatever wins must reach GLSL ES.
- **From this session (section 9):** a device per engine, with a renderer per view inside it. naga is allowed as a build tool, and as a lazily loaded runtime chunk for user code. Parity tolerances are tiered. Without `EXT_clip_control`, depth falls back to logarithmic depth. Styles and warps get a GLSL ES target now.

## 1. Scope

### What it draws, in order

| Content | Required? | WebGL 2 renderer | Milestone |
| --- | --- | --- | --- |
| glTF models (meshes, PBR metallic-roughness, textures, alpha mask) | Required | Yes | W4 (unlit), W6 (lit) |
| 3D Tiles meshes (b3dm, glb, i3dm) | Required | Yes, instanced through per-instance attributes | W4, W6 |
| Globe: ellipsoid and quantized-mesh terrain, skirts, upsampled quadrants | Required | Yes | W5 |
| Globe imagery (slices of a texture array, ancestor fallback, fades) | Required | Yes, composited by fragment passes | W5 |
| Billboards (pins) | Not listed | Yes: a quad per instance | W6 |
| Styles (`FeatureStyle`: `show`, `color`) | Not a content kind | Yes, through a GLSL ES target | W7 |
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

- **Compiled routes:** the transform graph's IR gets a GLSL ES emitter beside `codegen.ts`'s WGSL (section 4). The vertex stage runs the same fused `transformPoint`.
- **Centre constants** are computed on the CPU in float64 per draw. This replaces the df64 compute pass (`warpFitDirect.slang`) for parameters that don't separate. Parameters that enter linearly stay per-view uniforms.
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

| Code | Route | Depends on the core IR spike? |
| --- | --- | --- |
| Engine shaders (surfaces, terrain, imagery composite, present, atmosphere, IBL) | **Build time:** new WebGL-shaped entry points in Slang (attributes, uniform blocks, data textures, no storage buffers) that import the same pure modules (BRDF, materials, atmosphere sampling, tone curves). `slangc` writes WGSL, then naga writes GLSL ES 300. Checked in as generated output, as the WGSL is today (`npm run shaders`, `shaders:check`). naga is found through `NAGA`, as `slangc` is through `SLANGC` | No |
| Styles (`FeatureStyle`) and warps (compiled routes) | **Run time, compiler-free:** a GLSL ES 300 target beside WGSL in `styleExpression.ts` and in the transform graph's `codegen.ts`. Both are small expression emitters. A test compiles samples to both and checks they agree on CPU evaluation and in the parity pages | **Yes, later:** both targets retire for the core IR's GLSL ES back end once the spike decides. The emitters stay until then |
| User code: `CustomShader` hooks (WGSL, or Slang through slang-wasm) and user post stages (WGSL) | **Run time:** the linker joins the user's units with the WebGL surface entry points' WGSL (generated at build time and kept as link input), then a lazily loaded naga WASM chunk translates the linked module to GLSL ES 300 in a worker (owner, 2026-11-13). Slang hooks go Slang → WGSL (slang-wasm, as today) → naga | **Yes:** if the core IR takes "a WGSL function lowered through naga" as an input, user code may go through the IR instead. Until then, this route |

Notes:

- **Slang has no GLSL ES target.** `slangc` 2026.21 lists GLSL profiles `glsl_150` to `glsl_460` only (checked with `slangc -h` on 2026-11-13). Hence WGSL as the hop.
- **naga's GLSL ES back end works only for vertex and fragment code** with uniforms and textures, which is why the WebGL entry points are separate. Today's surface WGSL pulls vertices from storage buffers, which GLSL ES 3.00 can't do.
- **What W0 must confirm before anything depends on this route:** naga's handling of Slang's WGSL output (uniform layouts against std140, texture and sampler pairs combined, integer textures, `invariant`), the generated code's size, and the naga WASM chunk's size compressed. Which naga build to use (a published WASM package or our own from the crate) comes back to the owner with W0's numbers. That's the dependency the owner allowed.
- **GPU safety rules carry over:** every loop bounded by a constant, every data-texture index clamped. Read the generated GLSL before the first browser run of a changed shader, as `scripts/dumpMsl.mjs` is read for Metal.

## 5. Outputs and post stages

- **Named outputs (AOVs):**
  - `color`: the HDR scene, `RGBA16F`, resolved from MSAA.
  - `displayColor`: unlit, display-referred colour, `RGBA8` sRGB.
  - `depth`: resolved by `blitFramebuffer` (one sample, not an average).
  - `ids`: a single-sampled `RG16UI` pass (a 32-bit ID in two halves, as on WebGPU), drawn only when something reads it. A pick scissors it to the pick's window. A post stage reading IDs draws it full screen, which costs a second geometry pass, reported in the inspector.
- **Post chain:** the same three slots (`scene`, `exposed`, `display`) as fragment passes over the resolved targets. FXAA is already a fragment pass. Glare has no WebGL 2 step in the PoC.
- **User post stages** run through the runtime naga route in section 4. A stage whose WGSL uses compute (`POST_COMPUTE_BOUNDARY`) is refused with a notice. That's the same rule as the compute kernels.
- **Picks:** feature IDs and depth from the ID pass, read back asynchronously. `pickPosition` comes from depth and is stated with the depth buffer's accuracy at that distance. Log depth and reversed-Z give different accuracies, and both are stated. The exact hit point (WebGPU's `pickTriangle`) comes from the CPU ray backends where a tile's geometry is retained, and is otherwise the depth estimate with its accuracy.

## 6. Detection and selection

- **The option:** `Engine.create({ renderer: "auto" | "webgpu" | "webgl2" })`, default `"auto"`. Auto means WebGPU, then WebGL 2 if WebGPU is missing, with a warning once that gives the reason. Forcing one names it, and `strict` throws instead of falling back. This is the lead's default from batch 1; the owner didn't object (section 9).
- **The probe** is the same as the thread probe's (§13.41, "Threading"). It runs where the engine will run, in the worker when worker mode is chosen:
  1. WebGPU: `navigator.gpu`, `requestAdapter()` and a throwaway `OffscreenCanvas` `"webgpu"` context.
  2. Otherwise WebGL 2: a throwaway `OffscreenCanvas` `"webgl2"` context, plus the required extension `EXT_color_buffer_float` (HDR targets). Without it there's no renderer, and `Engine.create` rejects with a message that names what's missing.
  3. The real canvas's context is taken only after the probe succeeds. A canvas can hold only one context type, and `transferControlToOffscreen()` can't be undone.
  4. The result is cached per user agent, as the thread probe's is.
- **Facts under WebGL's own names,** never mapped onto WebGPU's (the profiles plan's rule): version and renderer strings (`WEBGL_debug_renderer_info` where allowed), `MAX_TEXTURE_SIZE`, `MAX_ARRAY_TEXTURE_LAYERS`, `MAX_3D_TEXTURE_SIZE`, `MAX_UNIFORM_BLOCK_SIZE`, `MAX_VERTEX_TEXTURE_IMAGE_UNITS`, `MAX_SAMPLES`, `MAX_DRAW_BUFFERS`, and the extensions `EXT_clip_control`, `WEBGL_multi_draw`, `EXT_float_blend`, `OES_texture_float_linear`, `EXT_disjoint_timer_query_webgl2`, and the compressed formats (S3TC/BPTC, ASTC, ETC2).
- **Personas** (the profiles plan's `src/profile/personas.ts`): `webgl2-basic` (WebGL 2 minimums plus `EXT_color_buffer_float`, no clip control, no multi-draw) and `webgl2-chrome` (with both). `emulate: "webgl2-basic"` runs the WebGL 2 device with extensions hidden, for tests.
- **Context loss:** reported on `Engine.errors` with kind `device`, and the engine stops, as WebGPU device loss does today. Rebuilding from the CPU scene comes later for both devices.
- **The inspector** shows the device and why it was chosen ("WebGL 2 · WebGPU unavailable: no adapter"), the paths, the facts, and per frame: draw calls, records culled on the CPU, CPU culling time, and data-texture upload bytes. GPU time comes from `EXT_disjoint_timer_query_webgl2` where it's exposed. Elsewhere it's shown as unavailable, never as zero. The layout stays fixed whichever device runs (the inspector rules).

## 7. Testing

### Node tests

- `test/fakeGl.ts`, beside `test/fakeGpu.ts`: a WebGL 2 stand-in that records calls and state and draws nothing. Tests count draw calls, programs and texture uploads, and check the change log drains completely.
- The boundary tests from section 2, and a bundle check that the WebGL 2 chunk loads only on demand.
- Emitter agreement: styles and routes compiled to WGSL and GLSL ES and evaluated on the CPU at sample points.
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
| `parity/customShader.html` (style rows only) | Styles. Hook rows once runtime naga lands | W7, W8 |
| Gallery: `vertical-exaggeration` | Warps on terrain and a tileset, the height-normal path | W7 |
| Gallery: `transform-graph` | Compiled routes, fitted lattices, per-view parameters | W7 |
| Gallery: `clipping` | Clip boxes and terrain clips | W10 |
| Gallery: `brep-first-look` (CPU tessellation form only) | B-reps as meshes; patches reported as unsupported | W6 |
| `parity/translucency.html` (moments only) | `moments16` and `moments32` against WebGPU's same steps | W10 |

Not compared: `night-sky` (points, and the sky data stays local), `realtime-tracks` (vectors), `translucency` with the exact step, `slang-playground`, and `csg` (patches).

The machine is shared and overloaded: browser runs happen at the milestones' ends, one small page at a time, as AGENTS.md says.

## 8. Milestones

Sizes: S is a few days with agents, M about a week. Model per role, as AGENTS.md says: the most capable model for design-heavy tasks and risky reviews, a fast one for well-specified work.

| # | Milestone | Size | Model | Needs | Done when |
| --- | --- | --- | --- | --- | --- |
| W0 | **Shader route spike** (a decision tool, per the spike rules). naga as a build tool through `NAGA`. Three entry points through Slang → WGSL → naga → GLSL ES 300: a minimal surface (attributes, a uniform block, a data texture), `present`, and one atmosphere table as a fragment pass. The naga WASM chunk built or adopted, its size measured, one user hook linked and translated in a worker. The page states the data, costs and decision asked | S | Opus | – | The owner picks the naga build; the route is confirmed or replaced |
| W1 | **Seam extraction, WebGPU only.** `WorldDraws` (records, batches, transforms, instances, materials, placements on the CPU, with a change log), `RenderDevice`, `WorldMirror`, `ViewRenderer`. The WebGPU renderer implements them. Pure moves: a type check per commit, the full suite and parity once at the end (the refactor rule) | M | Opus | – | No behaviour change. WebGPU parity suites unchanged. The boundary test has the `webgl2` tier |
| W2 | **Neutral content resources.** Texture sources in place of GPU textures in `gltfModel.ts`. `MeshData` kept until uploaded. `ImageryCompositor` with the WebGPU compute implementation moved behind it. The `GlobeImagery` exceptions removed from `TIER_EXCEPTIONS` | M | Opus | W1 | Same parity. Three fewer named exceptions |
| W3 | **Probe, option and an empty WebGL 2 device.** `renderer` option, the probe on both threads, facts, personas, the `webgl2` chunk loaded dynamically. Clears to the background colour; the inspector shows the device and reason. The profiles plan's M8 (support rules) lands with it | S | Sonnet | W1; profiles M2 | `emulate: "webgl2-basic"` makes an engine that clears. The bundle check passes |
| W4 | **First draws, unlit.** Slab mirrors, VAOs, data textures for records, materials and transforms, CPU culling, eye-relative float64 matrices, both depth paths, 4× MSAA, the present pass. glTF and 3D Tiles meshes, unlit | M | Opus | W0, W2, W3 | `models` and `tileset` unlit within tolerance. Selection identical |
| W5 | **Globe, terrain and imagery.** Terrain draws (skirts, upsampled clip boxes, height-normal attribute, geomorph), the fragment imagery compositor into a texture array, fades | M | Opus | W4 | `globe` and `imagery` within tolerance |
| W6 | **Lighting and instancing.** Sun and fixed ambient, PBR metallic-roughness, normal maps, double-sided, alpha mask, per-draw ordering for blended draws, instanced draws, billboards | M | Sonnet | W4 | Lit `models`, i3dm tiles, b-reps through CPU tessellation within tolerance |
| W7 | **Styles and warps.** GLSL ES targets in `styleExpression.ts` and the transform graph's emitter, the arena data texture, CPU centre constants, lattices as float textures | M | Opus | W6 | Style rows, `vertical-exaggeration` and `transform-graph` within tolerance. Emitter agreement tests |
| W8 | **Picks, outputs and user code.** The ID pass, async readbacks, `pickPosition`, named outputs, `view.support.outputs`. The runtime naga route for `CustomShader` hooks and user post stages | M | Opus | W4, W0's naga build | Pick parity. `customShader` hook rows within tolerance |
| W9 | **Atmosphere.** Atmosphere and sky tables as fragment passes, the sky, aerial perspective, image-based light from it, average-luminance exposure | M | Opus | W6 | Default-look pages within the atmosphere tolerance |
| W10 | **Further steps,** each small and separate: shadows, moments translucency, FXAA, clips, ambient occlusion, the depth-range readback | S each | Sonnet | W9 | Each step's page within tolerance. Each listed in the support rules |
| W11 | **The runner suite, the gallery switch and the handbook.** `node bench/run.mjs webgl2`; a renderer switch in the gallery shell; the handbook's architecture tab with the device and renderer levels and the WebGL 2 support table | S | Sonnet | Grows from W4 | One command runs every page in section 7 |

**Order.** W0 and W1 can run in parallel: different files, no shared results. Then W2 and W3, which touch different files and can also run in parallel. W4 needs W0, W2 and W3. After W4 the work is sequential, since W5 to W9 touch the same renderer files: W5, W6, W7, then W8 and W9, then W10. W11 grows from W4 onwards.

## 9. Questions for the owner, with answers

**Answered on 2026-11-13:**

1. **Is the renderer chosen per engine or per view?** _Answer: a device per engine, and a renderer per view inside it._ The owner's case was a WebGPU raster view beside a WebGPU path tracer, sharing textures. That fits, since both renderers sit on one device. WebGL 2 is a device of its own with one renderer. Mixed engines can come later if needed.
2. **Is naga OK as a build tool?** _Answer: yes._
3. **Parity tolerances against WebGPU?** _Answer: tiered, as in section 7._
4. **Depth without `EXT_clip_control`?** _Answer: logarithmic depth written per fragment, as a reported path._
5. **User custom shaders and post stages on WebGL 2?** _Answer: naga at run time, as a lazily loaded WASM chunk in a worker._ This makes naga a runtime dependency for user code only. The engine's own shaders don't need it.
6. **Styles and warps before the core IR decides?** _Answer: a GLSL ES target in both emitters now, retired for the core IR's back end later._

**Lead's defaults, not objected to (confirm in review):**

1. **"auto" falls back to WebGL 2** when WebGPU is missing, warns once, and reports it.
2. **The first visible milestones** draw unlit (W4), then lit by the sun with a clear background (W6), with the atmosphere in W9. W4 starts unlit because unlit parity is the simplest check of the seam.

**Still open:**

1. **Which naga WASM build?** A published package or our own from the crate. W0 brings sizes, and the owner picks.
2. **Which browsers is the WebGL 2 renderer for?** The handbook's compatibility tab should give the share without WebGPU before W10's further steps are ordered, so they follow what those browsers have (for example clip control, float blending, multi-draw).
3. **When does the WebGPU device split from its raster passes,** so a path-tracer view can share them? Not needed for this plan. It should be planned with the path tracer.

## 10. Risks

- **naga and Slang's WGSL** may disagree on layouts or features. W0 exists to find this out early. The fallback is hand-written GLSL ES for the entry points, keeping the shared modules shared through the WGSL hop where it works.
- **Draw-call count:** without multi-draw, Google Photorealistic 3D Tiles or NYC-scale scenes may reach thousands of draws per view. The inspector's counters will show it. Merging tiles' draws on the CPU is a later step, not a PoC one.
- **Log depth** loses early depth testing and differs from reversed-Z at silhouettes. Its parity is checked against WebGPU with its own stated `pickPosition` accuracy.
- **Two copies of work:** every new WebGPU feature now needs a decision for WebGL 2 (a step, or a declared absence). The support rules make that decision visible. The profiles plan's invariant tests fail when a required content kind lacks an implementation.
- **Data-texture limits:** `MAX_TEXTURE_SIZE` can be as low as 2048 under WebGL 2's minimums, which caps an `RGBA32UI` table at 64 MB. Large worlds page tables across texture arrays, or report a limit notice.
