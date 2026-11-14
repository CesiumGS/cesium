# Custom shading (PoC, after M4)

**What this holds:** The custom shading milestone as planned and worked through. Open points in it are not work items yet. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

- §3.4 foundations 1-6: shader identity in batches with an async pipeline
  cache, attribute directory, material parameter blocks, pass variants,
  the `cesium` Slang module, runtime compilation in a worker.
- Public API: a custom material and vertex modifier per model or tileset,
  and feature styling (`IFeatureStyle`) as the target 3D Tiles styling
  compiles to.
- Port representative 1.x `CustomShader` Sandcastles (attribute-driven
  color, feature styling, vertex displacement, unlit and PBR outputs) and
  compare against 1.x (L2).
- _Exit_: a user Slang material and vertex modifier on a model and on a
  tileset, compiled at build time and at runtime, in every pass; no frame
  stalls when a new shader arrives; batching cost per extra material type
  measured.

**Increment 1 (r46): the WGSL contract, shader identity and pass variants
(foundations 1, 4 and part of 5).**

- `CustomShader({ vertex, fragment, displacement })`: WGSL stages named as
  1.x's. `vertexMain(vsInput, vsOutput)` moves the vertex in model
  coordinates (position, normal); `fragmentMain(fsInput, material)`
  changes the glTF material's values after sampling and before lighting
  (base color, alpha, metallic, roughness, shading normal, occlusion,
  emissive, unlit). Inputs: model, camera-relative and Earth-fixed
  positions, normal, first UV and color, feature ID, vertex and instance
  index, screen pixel, `time` (new `View.time`, seconds since the engine
  started). The contract's structs live in opaque.wgsl; the engine's own
  module is the same code with no-op stages.
- On `ModelOptions.shader`, `Tileset3DOptions.customShader` and
  `DrawOptions.shader`. The batch key gains the shader; a displacement
  bound pads the draws' culling spheres.
- Pipelines: the 19 that draw content (opaque, lines, depth, shadow and
  prepass, masked and double-sided variants, translucent lists and
  moments) are one `SurfacePipelines` set built from one module, the
  engine's or a shader's. `ShaderCache` compiles a shader's set in the
  background once per distinct source; batches draw with the engine's
  until it is ready, then the world records again (no stall), and keep it
  if compiling fails. Errors are logged once, at the stage's own line
  (`fragment line 2: …`). `Engine.compileShader` warms a shader ahead.
- Harness `parity/customShader` (`bench/run.mjs customShader`), boxes on a
  ground plane with shadows and AO: identity stages and a failing shader
  match the default exactly (FLIP 0); color by height, a vertex twist
  (no depth-prepass holes; its shadows move with it), unlit and a
  translucent tint differ. Parity, models and translucency are unchanged
  (318 image metrics, none moved).
- Not yet: Slang authoring on this contract and runtime Slang (foundation
  6); named attributes (glTF parsing keeps only the core six; foundation
  2); parameter blocks and user textures (3); feature styling (needs
  properties on the GPU); changing a tileset's shader after load; a custom
  alpha doesn't reach the depth pass's alpha-to-coverage cutout (done in
  r47, Real-time tracks increment 1).

**Increment 2 (r46): Slang stages, at build time and at runtime
(foundations 5 and 6).**

- The `cesium` Slang module (shaders/cesium.slang, version 1) mirrors the
  contract's four structs; a shader `import cesium;` and defines
  `vertexMain`, `fragmentMain` or both, as in WGSL. The engine's shaders
  stay WGSL: only the user's stages go through Slang. Slang emits
  functions only from an entry point, so a generated stub fragment entry
  point calls the stages; Slang keeps them as functions (`vertexMain_0`)
  with renamed copies of the structs, fields in declaration order, and
  slangStages.ts appends the contract's functions, converting by
  position (the stub's entry point stays, unused).
- Build time (recommended): `npm run slang -- stages.slang` (SLANGC,
  scripts/slangShader.mjs) writes WGSL for `CustomShader({ wgsl })`.
  Runtime: `CustomShader.fromSlang(source)` compiles in one worker that
  loads the Slang WebAssembly build on first use (`slangUrl`). Errors
  come back with Slang's lines in the user's source.
- The harness's twist and color-by-height in Slang, both ways, draw
  exactly what the WGSL draws (FLIP 0, shadows and AO on); runtime is
  skipped where slang-wasm isn't served. Runtime cost: 0.5 s cold (worker
  and WebAssembly), 52 ms warm; the main thread's longest gap meanwhile
  19 ms.
- Remaining for the exit: a Slang shader on a tileset (the option exists;
  not yet shown with real content), frame times while a new shader's 19
  pipelines compile, and the batching cost per extra material type.

**Increment 3 (r46): pipelines on demand; the costs.**

- Microbenchmark `bench/shaderCost` (`bench/run.mjs shaderCost`). Arrival:
  1,024 boxes drawn every frame on a canvas while a shader the engine
  hasn't seen arrives on one more box. Compiling all 19 of its pipelines
  at once held frames up: worst 108, 47 and 67 ms for fragment-only,
  vertex-only and both, 1–2 frames over 34 ms and long animation frames
  each, though the main thread's WebGPU calls took 0.4 ms in all (the
  GPU process's compiling, ≈680 ms, competed with the frames' drawing).
- So a custom shader now compiles once (its module checked, errors
  reported) and each pipeline (`SurfaceKey`) is made in the background
  when a batch first asks for it; that pass uses the engine's pipeline
  until then. Opaque, one-sided triangles make 4 (opaque, depth, shadow,
  prepass) of the 19; translucent pipelines and their module only for
  blended content. `Engine.compileShader` still makes all 19 (warming
  ahead). Arrival then: 0 frames over 34 ms, worst 16.8–17.2 ms, the same
  as with no change; an unlit red shader shows from 400 ms after its box
  appears, drawn with the engine's shader before.
- Batching: 4,096 boxes at 1920×1080 spread over 1 to 64 shaders (each a
  batch and a pipeline switch): GPU 1.05–1.17 ms and CPU 0.11–0.27 ms per
  frame throughout, against 1.09 and 0.27 ms with the engine's own; at most
  ≈1 µs of GPU per extra shader, none measurable on the CPU.
- On a tileset: the harness streams `Batched/BatchedColors` (b3dm, tile
  content through `addModel`) with `customShader` height bands in WGSL
  (FLIP 0.013 against the default) and the same bands in Slang, compiled
  at build time and at runtime: both match the WGSL exactly. 12 of 12
  cases pass.

**Exit status (r46).** Met: a user Slang material and vertex modifier on
models and on a tileset, compiled at build time and at runtime, drawn in
every pass (opaque, depth, shadow, ambient-occlusion prepass,
translucent); no frame stalls when a new shader arrives; batching cost
per extra shader measured (≈1 µs GPU). Still open from this milestone's
list: named vertex attributes (foundation 2), typed parameters and user
textures (3), feature styling with properties on the GPU
(`IFeatureStyle`), and ports of 1.x `CustomShader` Sandcastles compared
with 1.x (L2), which need 2 and 3.

**Increment 4 (r47): named attributes and metadata property attributes
(foundation 2).**

- Decisions. glTF requires application attributes to start with `_`;
  1.x then renames them for shaders (`_TEMPERATURE` →
  `attributes.temperature`, stripped and lowercased), which is lossy
  (`_Temp` and `_TEMP` collide), hides which attribute a name reads, and
  types each shader per model. 2.0 instead has the shader declare what it
  reads: `attributes: { temperature: { semantic: "_TEMPERATURE", type:
"f32" } }`, a name of its choosing bound to the exact semantic. One
  shader, one compile, whatever the model. For data with meaning
  (temperatures, classifications) the primary path is metadata, not raw
  attributes: `EXT_structural_metadata` gives an attribute a schema
  (type, normalization, offset and scale), shared with 3D Tiles property
  tables and textures, and 1.x already exposes it as
  `fsInput.metadata.<property>`. Raw attributes are the layer under it.
- glTF parsing keeps every attribute the engine doesn't read itself
  (`TEXCOORD_1`, `COLOR_1`, `_TEMPERATURE`, …; not skinning or feature
  IDs) by semantic, and each property attribute by property ID with its
  offset and scale applied (the property attribute's own, else its
  class's; normalized integers come from the accessor already in [0, 1]).
  Both are unwelded with flat-shaded meshes. `MeshData.attributes` and
  `.metadata` take the same from code.
- The world uploads them as streams plus a per-mesh directory in the
  arena (count, then name hash, stream offset and components per entry,
  metadata under `metadata.<id>`); the draw record gains its offset
  (`DrawRecord.attributes`, the record 128 → 144 bytes). Nothing is read
  unless a shader declares it.
- `CustomShader({ attributes, metadata })`: types `f32`, `vec2f`,
  `vec3f`, `vec4f`, `mat2x2f` (glTF MAT2, column-major). The engine
  generates per shader the `Attributes` and `Metadata` structs in
  `VertexInput` and `FragmentInput`, a reader per value (`readNamed`: the
  directory searched by hash; zero where a mesh hasn't it) and a varying
  per value (locations 10–13, so at most 4 per shader), interpolated for
  the fragment stage. The pipeline cache keys on the generated code with
  the stages.
- Slang: the `cesium` module (version 2) is generated per shader with
  the same two structs (`fromSlang` takes the declarations; the CLI
  `--attributes name:type,…` and `--metadata`), and the adapter converts
  them by name. Matrices are transposed on the way in: Slang's are
  row-major in meaning, so `mul(m, v)` there is glTF's M v, as `m * v` is
  in WGSL.
- Harness, 9 new cases (21 of 21 pass): an asymmetric shear (MAT2) and
  heat on the boxes, in both stages, in WGSL and in Slang built both ways
  (identical: the transpose is right); a declared attribute and property
  a mesh hasn't read zero (identical to the default); 1.x's
  `BoxTexturedWithPropertyAttributes`: `temperatures` (normalized UINT16,
  offset/scale to °C) and `transformedWarpMatrix` (MAT2, offset/scaled)
  match the raw attribute transformed by hand exactly, and the vertex
  stage lifts by temperature. Parity, models and translucency are
  unchanged (318 image metrics, none moved).
- Not yet: integer attributes and metadata (all floats; flat
  interpolation for IDs), `noData` and `default`, metadata enums and
  strings, more than 4 values per shader (packing varyings would allow
  16 components), property textures (with user textures, foundation 3)
  and property tables on the GPU (with feature styling), and a 1.x
  comparison (L2) of the property-attribute Sandcastle.

**Increment 5 (r47): typed uniforms and user textures (foundation 3,
first part).**

- `CustomShader({ uniforms })`, as 1.x's: values (`f32`, `i32`, `u32`,
  `vec2f`, `vec3f`, `vec4f`, `mat3x3f`, `mat4x4f`; matrices column-major)
  read as `uniforms.<name>`, and textures (`type: "texture2d"`, a URL,
  `ImageBitmap`, `ImageData` or canvas; read as stored, rgba8unorm with
  mipmaps; repeat or clamp, linear or nearest) sampled as
  `textureSample(<name>, <name>Sampler, uv)`, in either stage. At most 4
  textures. `setUniform(name, value)` changes either; content redraws on
  demand.
- Binding. All four bind groups are in use, and a batch has one shader,
  so they extend group 2, the batch's texture set: the values at binding
  10, textures and samplers from 11 (8 of the device's 16 samplers were
  in use). A shader with uniforms has its own group-2 layout, per
  distinct code (`Pipelines.setLayout`); worlds make a group per texture
  set and shader, and bind it only with the shader's own pipelines (the
  engine's stand-in keeps the plain set). `ShaderBindings` keeps each
  shader's uniform buffer and textures on the device, written before
  frames (`flush`); a texture reads white until it has loaded, then the
  worlds record again. One buffer per shader object: shaders with the
  same code and different values share pipelines.
- The buffer follows WGSL's uniform layout, which for these types is
  std140's too, so Slang's `ConstantBuffer` matches it. Slang: the
  `cesium` module declares the same bindings (`[[vk::binding]]`,
  `--uniforms name:type,…` for the CLI); matrices are declared
  `row_major` and written transposed, so `mul(m, v)` there is M v. The
  pin matters: slangc 2026.20 stores uniform matrices column-major by
  default and the slang-wasm build row-major, so the same source drew
  differently until it was declared.
- Harness, 6 new cases (27 of 27 pass): every value type, including an
  asymmetric `mat3x3f` and a negative `i32`, matches the same values as
  constants exactly, from WGSL and from Slang both ways; `setUniform`
  after creation matches the constants with the new value; a texture by
  URL, sampled in the vertex stage (lifting) and the fragment stage,
  differs from a white one (it loaded). The harness now compiles the
  shader each case is compared with too (it had drawn with the engine's
  while compiling), and tells a missing slang-wasm from a served one by
  its content type (Vite answers missing paths with its HTML page, 200,
  so runtime cases ran and failed on a bench server without
  `SLANG_WASM_DIR` instead of being skipped); with it set, the bench
  passes 27 of 27. Parity, models and translucency are unchanged (318
  image metrics, none moved).
- Not yet: arrays and booleans, matrices other than 3×3 and 4×4, cube
  and array textures, textures in sRGB, sharing a texture between
  shaders, freeing a shader's buffers before the engine's end.

**Increment 6 (r47): metadata property textures.**

- `EXT_structural_metadata` property textures read the same as property
  attributes: a shader declares `metadata: { insulation: "f32" }` and
  reads `fsInput.metadata.insulation`, whichever way the mesh stores it.
  As in 1.x, only the fragment stage reads them; the vertex stage reads
  zero.
- Parsing records per property its texture, channels, component type
  (8-, 16- and 32-bit integers, FLOAT32), components, normalization and
  offset/scale; arrays, texture coordinates other than TEXCOORD_0 and
  `KHR_texture_transform` are warned about and skipped. Images were
  already decoded without color conversion or premultiplication.
- Up to 2 property textures per mesh join the texture set (group 2,
  bindings 20 and 21, `TextureSetOptions.properties`); a model makes a
  texture set per material and mesh where a mesh has them. The mesh's
  directory marks such a property (`TEXTURE_PROPERTY`) and points at a
  block describing its decoding; the vertex arena becomes readable by
  fragments for it. `readTextureProperty` fetches the texel at
  TEXCOORD_0 (repeating, nearest, `textureLoad`: the bytes exactly),
  assembles each component little-endian from the listed channels,
  converts, normalizes and applies offset and scale.
- Harness, 7 new cases (34 of 34 pass) on 1.x's test models: UINT8 and
  normalized UINT8 (`SimplePropertyTexture`), FLOAT32 over four channels
  (`PropertyTextureWith32BitTypes`) and normalized VEC2 with and without
  offset/scale (`PropertyTextureWithVectorProperties`) each match the
  same image bound as a user texture and decoded by hand in WGSL
  exactly; the vertex stage reads zero. Model cases are now framed by
  the model's bounds. Parity, models and translucency are unchanged
  (318 image metrics, none moved); the bench, with `SLANG_WASM_DIR`,
  passes 34 of 34.
- Not yet: arrays, `noData`/`default`, enums, other texture
  coordinates, texture transforms, more than 2 property textures per
  mesh, and property tables on the GPU (feature styling).

**Increment 7 (r47): feature tables on the GPU.**

- A mesh's feature table (`MeshData.featureTable`: an
  `EXT_structural_metadata` property table or a b3dm/i3dm batch table, as
  picking uses) reaches custom shaders as metadata too:
  `fsInput.metadata.Height` is the fragment's feature's value, in either
  stage, the same declaration whether the mesh stores the property per
  vertex, in a texture or per feature. Numbers, booleans (0/1) and
  numeric arrays of up to 4 are uploaded as float32 rows by local feature
  ID, once per table object and shared by its meshes (freed with the
  last); strings aren't; missing values read 0. Models pass each mesh's
  table (an i3dm's for its instances).
- The directory marks a column (`TABLE_PROPERTY`); the vertex stage
  reads the vertex's feature's row (an instance's feature for instanced
  draws; feature 0 for a draw without per-vertex IDs), and the fragment
  stage reads its own feature's row exactly
  (`readFragmentProperty`), not an interpolation.
- Harness, 3 new cases (37 of 37 pass): a box with each face a feature
  and a table (a scalar and a vec3 column, beside a string column that
  isn't uploaded) matches the same values as per-vertex attributes
  exactly, lifting faces in the vertex stage and tinting them in the
  fragment stage; the streamed `BatchedColors` tileset colored by its
  batch table's `Height`. Parity, models and translucency are unchanged
  (318 image metrics, none moved); the bench passes 37 of 37.
- Next for feature styling: a style API (show, color per feature) as the
  target 3D Tiles styling expressions compile to, on these columns; a
  way to hide features in every pass (depth, shadows) that a fragment
  stage's alpha doesn't reach; string and enum properties (an index per
  distinct value).

**Increment 8 (r47): 3D Tiles styles (feature styling).**

- `FeatureStyle({ show, color, defines, colorBlendMode })`: 1.x's style
  JSON, expressions and `conditions`, compiled to WGSL
  (styleExpression.ts) over the features' metadata, whichever way a mesh
  stores it, as a custom shader (`style.shader`, or
  `Tileset3DOptions.style`). Semantics as 1.x's `Expression`: JavaScript
  precedence, `rgb` in bytes, `rgba`/`color` alpha 0–1, `hsl` hue 0–1,
  CSS names and hex in `color()`, component-wise math (`round` halves
  up, as `Math.round`), vectors and `.x`/`.r` members, strict equality
  false across types, `${feature['name']}` for names that aren't
  identifiers. Types are checked at compile time; strings (other than
  `color()`'s), regular expressions and `undefined` are refused by name,
  since the GPU has no string properties.
- `show` false, or a color with alpha 0, hides a feature in the vertex
  stage: its vertices collapse to a point, so its triangles have no area
  in any pass (depth prepass, shadows, picking). A fragment discard
  would have left its depth in the prepass, a hole. `color` applies in
  the fragment stage ("highlight" multiplies, "replace", "mix" by
  amount); its alpha scales the material's.
- Custom shaders' `metadata` may name a field apart from its property
  (`{ property: "building:levels", type }`), as styles need.
- Unit tests (7) for precedence, property forms, 1.x's color
  conventions, vector typing and refusals; harness, 4 new cases (41 of
  41 pass): on `BatchedColors`, a show and a color style with conditions,
  a define, `color()`, `rgb()` and `hsl()` match the same written by hand
  in WGSL exactly; hidden faces of the feature box cast no shadows.
  Parity, models and translucency are unchanged (318 image metrics, none
  moved); the bench passes 41 of 41.
- Not yet: changing a tileset's style or shader after load (the batch
  key holds the shader; draws would move between batches), translucency
  from a style's alpha (1.x moves such features to the translucent pass),
  string properties (an index per distinct value would allow `===` on
  them), `pointSize` and the point-cloud style fields, regular
  expressions, more than 4 properties per style, and a 1.x comparison
  (L2) of styled tilesets.

**Increment 9 (r47): per-instance values (ahead of real-time tracks).**

- An instanced draw's streams (`InstanceOptions.streams`: `stride` words
  per instance, interleaved) name their fields (`layout: { heading: {
offset: 0, components: 1 }, … }`); the world stores a per-draw
  directory beside the data (`DrawRecord.instanceDirectory`, the
  record's spare word). A shader declares `instance: { heading: "f32",
symbol: "u32" }` (the named types and `u32`, `i32`) and reads
  `vsInput.instance.<name>`, `fsInput.instance.<name>`: exact in both
  stages, integers too (the fragment stage reads the arena by the
  instance's index, carried in one flat varying, location 14);
  `FragmentInput.instanceIndex` is new. Zero where a draw hasn't them.
- `World.setInstanceStreams(draw, firstInstance, data)` rewrites whole
  instances from one in a single copy: the bulk update tracks need (a
  feed's tracks as one typed array, no per-track call).
- The struct is `InstanceValues` (the engine's `Instance` is the
  instance table's). Slang: the same struct in the `cesium` module,
  `--instance name:type,…` for the CLI.
- Harness, 5 new cases (46 of 46 pass): three boxes as one instanced
  draw with lift, tint and an integer symbol per instance match the same
  constants indexed by `instanceIndex` exactly, in both stages; after
  `setInstanceStreams` rewrites one instance, the constants with it
  changed; Slang built both ways matches the WGSL. Parity, models and
  translucency are unchanged (318 image metrics, none moved); the bench
  passes 46 of 46.
