# Live MaterialX graph editing: plan for the gallery example

**Status (2026-11-13):** reviewed and merged. At review the owner dropped the pre-IR emitter (the example goes through Cesium IR's IR-15, with noise first in the gap order) and chose our own XML reader with a generated definitions table (see "Decided at review"). Its tasks are in `CESIUM2_WEBGPU_PLAN.md` §6, M10. Nothing is built yet.

**Goal:** a gallery example where the user edits a MaterialX material graph and sees it update live on a model, on a city and on terrain. Parameter edits are instant. Rewiring recompiles in the background while the last good material stays on screen.

**Spec:** CESIUM2_WEBGPU_PLAN.md §13.41: the shader toolchain research, the owner's answers of 2026-11-13 (answer 7), and the architecture decisions of the same day ("The core IR", "MaterialX stays at the edge").

**Decisions in force before this plan (owner, 2026-11-13):**

- The PoC gets a gallery example of live MaterialX graph editing. Build-time import alone isn't enough.
- MaterialX stays at the edge: an input language and the example's format, not part of the engine core.
- Styling stays compiler-free. Slang never loads for this example.
- Style literals become uniforms, so a value edit needs no new pipeline. The same rule applies to material graphs.
- Polished, deliberate UI. Build the design in context; the owner reviews by clicking around. No separate mockup gate.

**Decided at review (owner, 2026-11-13, after Cesium IR was decided):**

- **No pre-IR emitter.** The example lowers through Cesium IR (IR-15): WGSL from IR-4, GLSL ES from IR-5, float64 CPU evaluation from IR-3, literals as uniforms from IR-8. A second emitter would duplicate those and their tests.
- **Noise first in Cesium IR's gap order.** IR-G4 (noise) needs only the vocabulary's integer and bitwise ops, not textures, matrices or derivatives, so it moves to the front of the gap list. The places' graphs all need it. The gap milestones keep their labels.
- **Our own XML reader and a generated definitions table** (section 4), because `DOMParser` doesn't exist in workers or Node. This replaces the Cesium IR plan's `DOMParser` answer (its question 4). JsMaterialXCore loads only to upgrade documents older than 1.39.
- **While IR-15 isn't ready,** the document layer, the editor UI and the engine work (swap when ready, tileset and globe shader hooks, the water mask, emission in nits, OpenPBR tiers, glTF extensions) proceed: none of it needs the IR.

**Decided while planning (owner, 2026-11-13):**

1. **Scenes:** a lookdev stage, a city (OSM Buildings) and terrain. Terrain needs a custom-shader hook on the globe surface, which this plan adds.
2. **Node editor:** React Flow (`@xyflow/react`) is approved as a new dependency.
3. ~~Before the core IR lands: a small graph-to-WGSL (and JS) emitter.~~ **Superseded at review (owner, 2026-11-13):** no pre-IR emitter. Cesium IR was decided after this answer, and its IR-15 is the MaterialX front end. See "Decided at review".
4. **OpenPBR:** extend the engine's material, not only map onto today's. Tiers 1 and 2 belong to this plan. Tier 3 is listed below for a later plan.
5. **Emission:** support both display-relative and physical (nits). The switch was already decided on 2026-11-08 (CESIUM2_WEBGPU_PLAN.md, "Emission in nits") but isn't built: today `gltfParse.ts` ignores `KHR_materials_emissive_strength` and `surface.slang` treats all emission as display-relative. This plan builds it first (task 6a).
6. **glTF:** the `KHR_materials_*` extensions load into the same extended material, as a milestone of this plan.
7. **Terrain inputs:** a fragment hook on the globe surface, with height, slope, aspect and the **water mask** as graph inputs. The quantized-mesh water mask is extension 2 of the format, named in `quantizedMesh.ts`'s header but not decoded today.
8. **The official MaterialX Graph Editor** (owner asked whether it helps): it is desktop C++ on ImGui and isn't built for the browser, so it isn't code we run. We borrow its UX (node search by category, a property panel, a render view beside the graph, entering subgraphs) and the idea of its auto-layout (`source/MaterialXGraphEditor/Layout.cpp`). The official web viewer, **MaterialXView** (three.js on the full MaterialX WebAssembly build), is the reference renderer we compare against (task 11).
9. **Assets are fetched by `npm run setup`,** not vendored: the shaderball, example materials and their images, pinned, in a store outside the repository (task 1).
10. **Places that look cool** and show what custom shading on terrain and cities enables: water, moving snow lines, rock strata, procedural grass, floods, rain, lit windows. Eleven places, listed in section 1.

> **For agentic workers:** execute task by task, with a fresh implementer per task. Verification is lean, as the owner asked on 2026-11-11:
>
> - each task runs typecheck, eslint and prettier on its files, its own targeted tests, and at most one headless check;
> - the lead runs the full suite once before each merge;
> - no baseline worktrees or benchmarks unless the task says so.
>
> Name existing code by symbol (`grep -rn "class CustomShader" packages/next/src`). Other agents share this checkout: start each task with `git status` for the files it changes. Commit by path only. Never print `packages/next/.env.local`.

## Facts this plan rests on (checked 2026-11-13)

**MaterialX.**

- The latest release is **1.39.5**, published 2026-05-22. The one before it was 1.39.4 (2025-09-15). Licence Apache-2.0.
- **There is no official JSON form.** MaterialX documents are XML. JSON exists only in third-party tools: Bernard Kwok's `materialxjson` (Python, labelled for 1.39) and a QuiltiX plugin, with the mimetype `application/mtlx+json`. We read and write XML.
- **The standard library is large.** `stdlib_defs.mtlx` at v1.39.5 has 693 node definitions across 145 node categories. Groups by category count: math 47, procedural2d 23, compositing 18, adjustment 10, geometric 9, channel 8, conditional 8, procedural3d 7, texture2d 4, others smaller.
- **44 of those categories are defined as node graphs of other stdlib nodes** (197 of the 693 definitions, in `stdlib_ng.mtlx`). Among them: `place2d`, `ramp4`, `colorcorrect`, `hsvadjust`, `noise2d`, `noise3d`, `fractal3d`, `checkerboard`, `tiledimage`, `triplanarprojection`, `smoothstep`, `range`, `switch`. Once their building blocks are supported, these come by expanding MaterialX's own graphs.
- **Surface shaders** in `libraries/bxdf`: `open_pbr_surface`, `standard_surface`, `gltf_pbr`, `usd_preview_surface`, `disney_principled`, `lama`. Translation graphs: `standard_surface_to_open_pbr`, `open_pbr_to_standard_surface`, `standard_surface_to_gltf_pbr`, `standard_surface_to_usd`.
- **Example materials** (Apache-2.0) in `resources/Materials/Examples`: ten OpenPBR ones (aluminum brushed, car paint, default, glass, honey, ketchup, light bulb, pearl, soap bubble, velvet), which set parameters only, with no node graphs. The Standard Surface set has graph-based ones: marble (solid, from `fractal3d`), brick (procedural), wood (tiled), brass (tiled), onyx (hex-tiled). The marble graph is 12 nodes: position, dot product, multiply, `fractal3d` (integer `octaves`), add, sin, power, mix.
- **Preview geometry:** `resources/Geometry/shaderball.glb` (2.5 MB, Apache-2.0).
- **Graph positions:** MaterialX nodes carry `xpos` and `ypos` attributes for editors. Documents without them need auto-layout.

**OpenPBR.** The spec is 1.1.2, dated 2026-10-28. The implementation paper is Portsmouth, Kutz and Hill, "OpenPBR: Novel Features and Implementation Details", arXiv 2512.23696 (29 December 2025). The lobe models (from the spec; parts of the paper were read only in summary):

- base diffuse: energy-preserving Oren–Nayar (EON), driven by `base_diffuse_roughness`;
- metal: GGX conductor with F82-tint Fresnel (`specular_color` as the edge tint);
- dielectric specular: GGX, `specular_ior`; `specular_color` tints reflection only;
- coat: GGX dielectric over an absorbing medium (`coat_color`, `coat_darkening`), with its own normal and tangent;
- fuzz: a fibre microflake volume approximated with linearly transformed cosines (LTC), with tables of LTC coefficients and albedo over (μ, roughness);
- thin film: Belcour–Barla (2017), folded into both Fresnels;
- transmission and subsurface: slabs over volumes (Beer–Lambert extinction from `transmission_color` and `transmission_depth`, Henyey–Greenstein anisotropy, dispersion by Abbe number; subsurface by radius and colour);
- layering: albedo scaling, `f = f_coat + (1 − E_coat(ω_o)) · f_sub`, with E tabulated or estimated;
- emission: `emission_luminance` in cd/m² (nits);
- implementations may approximate layering and volumes, and may disable anisotropy for cost.

**Node editor libraries.**

| Library                      | Licence | Latest                                                                | Notes                                                                                                                                   |
| ---------------------------- | ------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| React Flow (`@xyflow/react`) | MIT     | 12.12.1, released 2026-11-02; repository pushed 2026-11-12; 39k stars | React, like the gallery. Dependencies: `zustand`, `classcat`, `@xyflow/system`. About 1.2 MB unpacked. Click-to-connect for touch.      |
| Rete.js (`rete`)             | MIT     | core 2.0.6, released 2025-06-30 (last core commit the same day)       | Framework-neutral, with render plugins. Plugins are newer (Angular plugin 2.6.0, 2026-01-09); the core has had no release in 16 months. |
| litegraph.js (jagenjo)       | MIT     | last commit 2024-01-08                                                | Canvas 2D. Unmaintained. Comfy's fork (`Comfy-Org/litegraph.js`) is archived and folded into ComfyUI's front end.                       |
| Baklava.js                   | MIT     | 2.8.1, released 2025-11-02                                            | Vue only.                                                                                                                               |
| Our own                      | —       | —                                                                     | No dependency, but pan, zoom, wires, selection, touch and keyboard first: about two extra tasks before any MaterialX work shows.        |

React Flow is chosen (owner, 2026-11-13). It loads only in the example's lazy chunk, never in the engine.

**MaterialX's own shader generators** (checked 2026-11-13 on the repository's `main`; owner asked at review):

- MaterialX has generators for GLSL, ESSL, MSL, OSL, MDL, Vulkan GLSL and **Slang** (`MaterialXGenSlang`, with `MaterialXRenderSlang`; the release notes first mention Slang at v1.39.5). Its **"WGSL" generator** is a flavour of the Vulkan GLSL generator ("WGSL Flavor of Vulkan GLSL shader generator"): GLSL meant to be translated to WGSL, not WGSL itself.
- The JavaScript build exposes all of them (`JsMaterialXGenSlang`, `JsMaterialXGenWgsl`, `JsMaterialXGenEssl` and others in `source/JsMaterialX`).
- **Not the runtime path,** for these reasons:
  - **Whole shaders with MaterialX's own lighting.** The generators emit complete shaders with MaterialX's closures and BSDF code. We need the pattern graph only, bound onto the engine's material and lighting (section 5), so the same graph lights like everything else in the scene.
  - **No CPU evaluation.** Thumbnails and picks need the graph evaluated in float64 on the CPU (section 6). Generated text gives none.
  - **Compilers at runtime.** Live Slang would load the MaterialX generator wasm and the Slang compiler on every rewire, which the owner ruled out for styling (§13.41: compiler-free, Slang offline or for post stages only). The "WGSL" flavour would need a GLSL-to-WGSL translator in the browser.
  - **One path for both renderers.** Cesium IR emits WGSL and GLSL ES from one program, with literals already turned into uniforms.
- **Where they help:** as a reference. MaterialX's generated code is the authors' own implementation of each node, so it can check IR-15's per-node results offline (dev and CI only, with the native Slang compiler or the GLSL output), and task 11 compares whole materials against MaterialXView.

**Prior art in the browser.**

- **MaterialXLab** (Bernard Kwok): a web graph editor that wraps LiteGraph and runs the full MaterialX WebAssembly build. Its layout puts the graph on the left, the view and a property editor on the right. Its repository returned 404 on 2026-11-13, so its licence is unchecked. UX prior art only.
- **three.js `MaterialXLoader`:** parses `.mtlx` in JS without the MaterialX library and maps nodes to three.js's own node system. A pull request (#33485, closed 2026-07-20) added `open_pbr_surface` and `gltf_pbr`. Evidence that a subset parser without the library is practical.
- **Needle Engine** uses the official MaterialX JS library (`@needle-tools/materialx`) for OpenPBR, Standard Surface, UsdPreviewSurface and unlit.

**The engine today.**

- **`CustomShader`** (`src/scene/CustomShader.ts`): WGSL `vertexMain` and `fragmentMain` against the contract, with typed uniforms, at most 4 textures (`MAX_TEXTURES`), and `setUniform` writing the uniform buffer with no new module or pipeline. The fragment stage gets `positionMC` (the design position), `positionEC`, `positionWC` (float32: about a metre at Earth scale), `normal`, `texCoord0`, `color0`, `time`, named attributes and metadata.
- **`MaterialOutput`** (`src/shaders/cesium.slang`): `baseColor`, `alpha`, `metallic`, `roughness`, `normal`, `occlusion`, `emissive`, `unlit`. Lighting is GGX plus Lambert, with prefiltered image-based lighting and Fdez-Agüera multiple scattering (`surface.slang`). `gltfParse.ts` supports only `KHR_materials_unlit` among material extensions. Emission is display-relative: not exposed, not metered.
- **Pipelines** (`src/scene/ShaderCache.ts`): one entry per distinct shader source, kept for the device's life, so returning to an earlier graph costs nothing. The code says 50–110 ms per new shader in the background. Opaque one-sided content with shadows and AO needs 4 of 19 pipelines. Until a pipeline is ready, **content draws with the engine's default material**, not the previous shader. `Engine.compileShader` compiles all 19 (seconds on a cold engine, says `examples/csg`); `Engine.whenReady(view, { draws })` waits for only the pipelines in use, and `examples/csg` adds a new solid hidden and swaps it in after that wait.
- **Where shaders attach:** `ModelPlacement.setShader` changes a model's shader at any time. `Tileset3D` takes `customShader` only as a constructor option. The globe has no custom-shader hook.
- **Picks** carry a `PickDomain` for meshes: the triangle and its barycentrics (`src/scene/pickDomain.ts`), so a material input (texture coordinate, normal, position) can be interpolated exactly on the CPU, if the mesh's CPU attributes are still held.
- **An IR already exists for transforms** (`src/transform/ir.ts`): a hash-consed scalar DAG with named parameters, float64 evaluation, autodiff, intervals and a WGSL back end. It has no textures, vectors as values, integers or loops. **Cesium IR** (§13.42, decided after this plan was drafted) replaces it and is the core IR every function goes through, MaterialX included (IR-15).
- **Gallery:** examples are modules under `packages/next/examples/<slug>/` registered in `examples/index.ts`. `run` may return a React panel. The **Slang playground** (`examples/slang-playground`) is the closest sibling: a lookdev stage (no globe, a background colour, procedural studio light, a key light, orbit controls), a model list including Khronos samples loaded from GitHub, and "keep the last shader that compiled".

## 1. The experience

**What it's for.** It shows three claims at once:

- a material is a graph you can open, read and change;
- the engine runs that graph on any content (a model, a city, terrain) with the same lighting;
- value edits cost nothing, and rewiring costs one background compile.

**Audience.** Lookdev and technical artists who know MaterialX or a node editor (Substance, Blender, Houdini), and engine users deciding whether their material pipeline can come along.

**Scenes** (picker at the top of the panel):

1. **Stage.** MaterialX's shaderball on the Slang playground's stage: background colour, environment (Studio, Sunset, Overcast, Dark), key light, exposure. The model list from the playground (shapes, repository samples, Khronos samples) is one click away. Default scene.
2. **City.** OSM Buildings (ion) over Cesium World Terrain, the material on every building, at four places (below). City graphs use local positions and triplanar projection, since OSM Buildings has no texture coordinates. Per-building inputs (`geompropvalue` of the feature ID and of OSM properties such as the building's height and kind) let a graph vary by building.
3. **Terrain.** Cesium World Terrain with imagery, the material on the globe surface, at seven places (below). Graph inputs: `height` (m above the ellipsoid), `slope` (radians), `aspect` (radians from north), `water` (0 to 1, the water mask, filtered so its edge is soft), `latitude`, `camera_distance` (m, for detail that fades with distance), and the imagery's colour.

**Scene controls are graph inputs.** Each place's preset exposes a few interface inputs as large sliders over the view: season, snow line, flood level, wind, wetness, time of day. Moving one is a uniform edit, so it is instant everywhere. Inputs the scene owns (the sun's elevation, the clock) are written once per frame by the example through the same `setUniform`.

### Places (owner, 2026-11-13: "places that look cool … that will blow minds that this is CesiumJS")

Each place is a camera view plus a default graph. The picker shows them as cards with a thumbnail. Coordinates are where the camera looks; views are tuned in task 5d. Every graph below uses only subset A plus tier 1 lobes, unless marked.

**City** (OSM Buildings):

| Place                             | Look at            | The show                                                                                                                                                                                                                                                                     |
| --------------------------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seattle: the Space Needle         | 47.6205, −122.3493 | **Rain.** A wetness slider darkens walls, drops roughness on flat roofs (normal near up) and adds rain ripples there: animated noise in the normal. Wet ground meets dry walls where the slope turns vertical.                                                               |
| Philadelphia: City Hall           | 39.9524, −75.1636  | **Night windows.** Brick and limestone by building (feature ID picks the palette), a window grid from local height (floors every 3.5 m) and position along the wall, and some windows lit at night: emission in nits, so exposure makes them glow as the sun sets (task 6a). |
| Paris: from the Eiffel Tower east | 48.8584, 2.2945    | **Haussmann.** Cream limestone walls, zinc roofs (flat-ish normals get a blue-grey metal with F82 tint, task 6) and a golden-hour time-of-day slider.                                                                                                                        |
| Manhattan: Midtown                | 40.7549, −73.9840  | **Glass towers.** Tall buildings (by OSM height) get mirror-like curtain walls with a mullion grid, reflecting the sky through image-based lighting; low ones stay masonry. Lit floors at night as in Philadelphia.                                                          |

**Terrain** (Cesium World Terrain):

| Place                                         | Look at            | The show                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crete: Balos lagoon and the White Mountains   | 35.58, 23.59       | **Water.** The water mask drives a sea surface: animated wave normals from two scrolling noise layers, IOR 1.33, low roughness so the sun glints, turquoise in the shallows near the soft mask edge and deep blue away from it, a foam band at the shore. The White Mountains (2,453 m) inland get winter snow from the season slider. |
| The Himalayas: Everest, Lhotse and Ama Dablam | 27.9881, 86.9250   | **Moving snow line.** Snow above a line that a season slider moves (or that plays a year in 30 seconds); north faces hold snow lower (aspect); slopes past about 50° shed it, so rock ribs stay dark; blue glacier ice on gentle slopes in a height band. Noise breaks the line up so it reads as real.                                |
| Grand Canyon: Mather Point                    | 36.0617, −112.1077 | **Rock strata.** Bands by height after the canyon's real layers, rim to river: Kaibab limestone (cream grey), Toroweap, Coconino sandstone (pale), Hermit shale and Supai (red), Redwall limestone (grey stained red), Tonto, Vishnu schist (dark). Noise warps the band edges. A "Topographic" toggle overlays contour lines.         |
| Mount Fuji and Lake Kawaguchi                 | 35.3606, 138.7274  | **Seasons on a cone.** The symmetric snow cap grows and shrinks with the season slider; the lake below uses the water graph, calm (less wave height).                                                                                                                                                                                  |
| The Matterhorn and Zermatt                    | 45.9763, 7.6586    | **Procedural grass.** Where the slope is gentle, the height is below the tree line and the imagery is green, close-up detail is added that imagery can't have: noise colour variation and a grassy normal, fading out by `camera_distance` (2 km). Rock above, snow on top.                                                            |
| Geirangerfjord, Norway                        | 62.1049, 7.0947    | **Fjord.** Glassy dark green water reflecting the sky and the cliffs' colour, steep walls left as rock, meadows on the ledges (the grass graph), snow on the tops.                                                                                                                                                                     |
| The Netherlands: Flevoland and the IJsselmeer | 52.45, 5.50        | **Flood level.** A slider raises a water level; land below it (height under the level) turns to the water graph, with the shoreline foam moving as it rises. Flevoland lies about 5 m below sea level. To verify in task 5d: that Cesium World Terrain's heights there are good enough to show it.                                     |

**A global snow line** is one more terrain preset that works anywhere: the snow line's height follows latitude (about 5,000 m near the equator, falling toward the poles) and the season slider, so flying anywhere shows plausible snow.

**Cost:** terrain graphs run on every terrain fragment. Each place's default graph must hold 60 frames a second at 1080p on an Apple M2; task 5d measures with the inspector recorder and caps noise octaves by `camera_distance` where needed.

**Presets** (a gallery strip under the scene picker, each with a small swatch):

- **Graphs from MaterialX:** marble, brick, wood, brass, onyx. These show rewiring best.
- **OpenPBR materials from MaterialX:** the ten examples. Parameter-only; once the engine material is extended (tasks 6–7) they show coat, F82 metals, thin film and fuzz. Glass, honey, ketchup and the soap bubble need tier 3; until then they draw with a "needs transmission" badge and the lobes this renderer has.
- **Our own,** written for this example: the places' graphs above (water, snow line, strata, grass, flood, rain, night windows, glass towers), plus "Topographic" (contour lines from `height`, tinted by slope) and the global snow line. Each works on any place of its scene, not only its own.
- **New:** an empty graph with an `open_pbr_surface` and a material output.

**Editing.**

- **Parameter edit:** select a node, change a value in the property panel, or drag a number directly on the node. The material updates on the next frame.
- **Rewire:** drag from an output port to an input port; drop a node from the palette; delete; disconnect. The editor refuses a connection between types that don't match (the port lights red during the drag and names both types) rather than letting an error happen later.
- **Material interface:** a node graph's interface inputs (MaterialX's `interfacename`, with `uiname`, `uifolder`, `uisoftmin` and `uisoftmax`) appear as a plain parameter list grouped by folder. This is the main editing mode on phones and for people who don't want to see wires.
- **Palette:** press Tab or double-click the canvas for a search box over node names and categories (as MaterialX's editors do), plus a collapsible category list. Every stdlib node is listed with its real ports. Unsupported ones are listed too, greyed with "not supported yet", so the user learns what exists.
- **Subgraphs:** a nodegraph shows as one node; double-click enters it, with a breadcrumb back.
- **Undo and redo:** every edit, including value drags (one step per drag, not per frame).
- **Files:** open `.mtlx` (file picker or drop on the page), download `.mtlx`, copy a link. A link carries the preset name plus changed values while they fit in a URL; a rewired graph is downloaded rather than linked.

**Feedback.**

- **Compile status** sits on the material output node as a chip that appears only if a compile takes longer than 100 ms ("Compiling…"), so fast compiles don't flicker. The view keeps the last good material.
- **Errors inline:** a node that can't be lowered (unsupported node, a type the back end can't express, past the 4-texture limit) gets a hatched header and a short reason. The graph's last good material stays on screen. A shader that fails to compile (an emitter bug, not a user error) shows a banner with the WGSL compiler's first message and keeps the last good material.
- **Not drawn by this renderer:** inputs the renderer ignores (tier 3 lobes; on the WebGL 2 renderer, whatever it drops) stay editable, are written back to the file, and show a small "not drawn" mark with the reason on hover. This is the renderer's support report in the scene's terms (§13.41, renderer decisions).
- **Node thumbnails:** each pattern node shows a small swatch of its output (section 6). Toggle off in the toolbar.
- **Pick readout:** click the content and the panel lists, for that point, the selected node's output and the final material values (base colour, metalness, roughness, coat and so on), computed on the CPU (section 6).

**Layout.**

- **Desktop (≥ 1100 px):** the view takes the left part, at least 55% of the width. On the right, one resizable column split vertically: the graph editor on top (about 60%), the property panel below it. The scene picker, presets strip and toolbar (open, download, link, thumbnails, undo, redo, auto-layout) sit in a thin bar across the top of the right column. Dragging the divider between view and column trades space; double-clicking it maximizes the graph.
- **Tablet (768–1099 px):** the view on top (about 50% of the height), the graph and property panel side by side below.
- **Phone (< 768 px):** the view on top at 45% of the height, never smaller. Below it a sheet with three tabs: **Parameters** (the material interface, default), **Graph**, **Presets**. Graph: one-finger pan, pinch zoom, tap a node to select it (its properties slide up from the bottom), tap an output port then an input port to connect (React Flow's click-to-connect), long-press for delete and disconnect. The palette is a full-width search sheet. Thumbnails are off by default to save battery.
- **Visual language:** follows the gallery's theme (Stratakit tokens) in light and dark. Node headers are coloured by group (math, procedural, texture, geometric, surface), ports by type (float, colour, vector, integer, boolean, surface shader), and wires take the colour of their type. Numbers use tabular figures. Fixed explanations sit behind an ⓘ tooltip (the inspector rules of 2026-11-13).
- **Design pass:** task 3 builds the layout in context; the owner reviews by clicking around, then one polish round.

## 2. Edit latency targets

| Edit                                                                        | What happens                                                                                        | Target (Apple M2, Chrome)                                                                                                              |
| --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Value of an unconnected input                                               | `setUniform` on the material's `CustomShader`. No module, no pipeline.                              | Visible on the next frame. Drags coalesce to one write per frame.                                                                      |
| Texture of an `image` node                                                  | `setUniform` with the new image (bind group change, no compile).                                    | Visible once the image has decoded.                                                                                                    |
| Sampler setting (filter, address mode)                                      | A new sampler in the bind group, no compile.                                                        | Next frame.                                                                                                                            |
| Integer that sizes a loop (`octaves`)                                       | A uniform, with the loop compiled to a cap (16), running `min(n, cap)`.                             | Next frame while within the cap. Past the cap: a rewire.                                                                               |
| Turning a lobe on from weight 0                                             | Per-lobe feature bits pick the pipeline (task 6), so this is one compile.                           | As a rewire. Later weight changes are value edits.                                                                                     |
| Rewire, add or delete a node, change a node's type, an enum input (`space`) | Lower the graph, emit, compile the new shader in the background, swap when its pipelines are ready. | Lowering and emitting under 5 ms for 100 nodes. New material visible within 150 ms at the median and 300 ms at p95 for opaque content. |
| Undo to a graph seen before                                                 | The shader source matches a cached entry.                                                           | Next frame.                                                                                                                            |

**The last good material stays on screen.** Today a new shader draws the engine's default material until its pipelines are ready, which would flash on every rewire. Task 2b adds `setShader(next, { swap: "whenReady" })`: the content keeps drawing with its current shader until `next`'s pipelines for the passes this content uses are ready, then switches in one frame. A newer `setShader` supersedes a pending one. The same option goes on `Tileset3D.setShader` and the globe hook.

**Measured, not assumed.** Task 3 records the timings with the inspector recorder (CSV and sparklines, not snapshots), for the marble graph with one wire moved, on the stage and on the city. If the median misses 150 ms, the first suspects are pipelines made in series and the shadow and depth variants made before the colour pass.

## 3. The node editor

**React Flow,** for these reasons:

- it is actively released (12.12.1 on 2026-11-02) and MIT;
- it is React, as the gallery's panels are, so it gets the gallery's theme, portals and focus handling through `ExampleRun.panel`;
- it has custom nodes as plain React components, typed handles, click-to-connect for touch, a minimap and keyboard selection;
- its state is ours: we keep the MaterialX document as the source of truth and derive React Flow's nodes and edges from it.

**Rete.js** was the runner-up: MIT and framework-neutral, but its core hasn't released since 2025-06-30. **litegraph.js** is unmaintained and its maintained fork is now inside ComfyUI. **Our own** would cost about two tasks before any MaterialX work shows.

**Shape of the code** (`examples/materialx-graph/`):

- `document → view model`: one pure function maps the document to React Flow nodes and edges (positions from `xpos`/`ypos`, or from auto-layout).
- **Edits are commands** on the document (`connect`, `disconnect`, `addNode`, `removeNode`, `setValue`, `setPosition`), each invertible for undo. React Flow's change events become commands; nothing else writes the document.
- **Custom node component:** a header (name, category colour, status), ports with type colours, inline value widgets for unconnected inputs (number scrubber, colour swatch, vector fields, enum menu, file for images), a thumbnail. Unsupported nodes keep their ports, so wires to them stay visible.
- **Auto-layout:** a layered layout of our own (columns by depth from the output, ordering to reduce crossings), after the idea of MaterialX's `Layout.cpp`. No layout dependency.

## 4. Format and parsing

**XML, without the MaterialX library.** The full library's WebAssembly build is several megabytes and has no official npm package. We need only the document model, so we write our own:

- **Reader:** a small XML reader for what MaterialX documents use: elements, attributes, comments, the XML declaration and the five predefined entities. It runs in browsers, workers and Node tests alike (no `DOMParser`, which Node lacks). Anything else (DTDs, processing instructions, CDATA) is refused with its line and column.
- **Document model:** plain typed objects: `materialx` (version, colorspace), `nodegraph`, nodes, `input` (type, value, `nodename`, `nodegraph` + `output`, `interfacename`, `colorspace`, `uniform`, UI attributes), `output`, `surfacematerial`. `look`, `materialassign`, `xi:include` and anything unknown are kept as opaque elements, so they round-trip, and are flagged "ignored".
- **Writer:** writes the model back with stable attribute order. Round-trip tests: every example material at v1.39.5 reads and writes to a semantically equal document.
- **Node definitions:** `scripts/materialxDefs.mjs` reads `stdlib_defs.mtlx`, `stdlib_ng.mtlx` and the bxdf definitions at the pinned tag v1.39.5 and writes a compact generated table: each nodedef's category, group, inputs (name, type, default, enum values) and outputs, plus the node graph implementations of the 44 categories that have them. Checked in as generated data with Apache-2.0 attribution. Estimated 60–80 KB, about 10 KB compressed. Node definitions resolve by MaterialX's rule (category, output type, input types).
- **Versions:** 1.39 documents are read directly. Older versions are upgraded by JsMaterialXCore (the official library's WebAssembly build, about 1.1 MB), loaded on demand only for such a document and never in the main chunk; where it can't load, the document is refused with a message naming the version.
- **Colour spaces:** values and images carry `colorspace` (document default, then per input). Supported: `lin_rec709` (the engine's), `srgb_texture`, `acescg`, `g22_rec709`, `lin_ap1`; conversion is folded into the lowering. Others are refused with a message.

**Supported first** (subset A, task 2; about 70 categories counting those that expand from MaterialX's graphs):

- **Math and channel:** add, subtract, multiply, divide, modulo, absval, sign, floor, ceil, round, fract, power, safepower, sqrt, exp, ln, sin, cos, tan, asin, acos, atan2, min, max, clamp, invert, magnitude, normalize, dotproduct, crossproduct, distance, reflect, refract, rotate2d, rotate3d, transformpoint, transformvector, transformnormal, place2d, trianglewave; convert, combine2–4, separate2–4, extract, constant.
- **Adjustment and compositing:** mix, remap, range, smoothstep, contrast, saturate, luminance, rgbtohsv, hsvtorgb, hsvadjust, colorcorrect; plus, minus, difference, burn, dodge, screen, overlay.
- **Conditional:** ifgreater, ifgreatereq, ifequal, switch, and, or, not, xor.
- **Geometric and application:** position, normal, texcoord (index 0), geomcolor, geompropvalue (named attributes, and the terrain names), time.
- **Procedural:** noise2d, noise3d, fractal2d, fractal3d, cellnoise2d, cellnoise3d, worleynoise2d, worleynoise3d, checkerboard, ramp, ramp4, ramplr, ramptb, splitlr, splittb, randomfloat, randomcolor. Noise is written as Cesium IR library functions (IR-G4), after MaterialX's GLSL library (Apache-2.0). Its hash is integer arithmetic (`mx_hash_int`, Jenkins), which the float64 evaluator reproduces exactly (`Math.imul` and `>>> 0`), so CPU and GPU agree except for float rounding.
- **Texture:** image, tiledimage, triplanarprojection. At most 4 images per material (the `CustomShader` limit).
- **Surfaces:** open_pbr_surface, standard_surface (through MaterialX's `standard_surface_to_open_pbr` graph), gltf_pbr, surface_unlit, surfacematerial.

**Later:** hextiledimage, the 2D pattern nodes (circle, grid, hexagon, tiled shapes), unifiednoise, blur, heighttonormal, normalmap, bump (needs tangents, task 7), tangent and bitangent (task 7), the remaining compositing nodes, matrices beyond the transform nodes, `frame`, volumes, `usd_preview_surface`, `disney_principled`, `lama`.

**Unsupported nodes** show in the editor with their real ports, a hatched header and "not supported yet". A graph that uses one keeps its last good material. The document keeps them, so a file opened and saved here loses nothing.

**Where world space comes from.** MaterialX's `space="world"` would read `positionWC`, which is float32 Earth-fixed, about a metre of precision: patterns would swim. The lowering maps world space to a local east-north-up frame at the scene's anchor, which the example declares, and documents the departure. Object space reads the design position (`positionMC`), so a pattern stays on a surface a warp moves.

## 5. The runtime path

```text
.mtlx text ──read──▶ document ──flatten──▶ flat graph ──lower──▶ core IR ──▶ WGSL         (WebGPU renderer)
                       ▲  │                (one surface,                 ├─▶ GLSL ES 300  (WebGL 2 renderer)
                       │  │                 typed, literals              └─▶ float64 evaluator (thumbnails, picks)
             editor commands                as uniform slots)        (Cesium IR: IR-15 lowers; IR-3, IR-4, IR-5, IR-8)
```

**Where the code lives.** MaterialX stays at the edge: a new entry `packages/next/materialx/` (published as `@cesium/next/materialx`, like `widgets`), never imported by `src/`. It holds the reader and writer, the document model, the generated definitions, flattening, lowering and the surface binding. The example (`examples/materialx-graph/`) holds only the UI and scenes. `scripts/checkBundle.mjs` gains a check that no `src/` chunk imports `materialx/`.

**Flattening** (back-end independent, tested on its own):

1. Resolve each node's definition.
2. Expand node graph references and the 44 categories implemented as stdlib graphs, binding `interfacename` inputs.
3. Fold colour-space conversions and defaults in.
4. Type-check every connection.
5. **Literals become uniform slots:** every unconnected input of a non-structural type gets a slot with a stable key (`nodegraph/node/input`). Its value goes in a values array. The key survives edits that don't touch that input, so a rewire elsewhere keeps the user's values.
6. **Structural inputs** stay compile-time: enum strings (`space`, a `switch`'s `which` when it's an enum), types, and integers beyond loop caps.
7. Split off the **surface binding:** the surface node's inputs, each either a slot or the output of a pattern subgraph.

**Binding to the engine's material.** Closures never enter the core IR. The surface node maps onto the engine's material struct:

- **`gltf_pbr`** maps one to one onto today's `MaterialOutput`, and onto the glTF extensions' fields after task 8.
- **`open_pbr_surface`** maps onto the extended material of tasks 6–7, field by field. Until task 6 lands: base colour × weight, metalness, specular roughness, emission, opacity and normal reach today's fields, and the rest show "not drawn".
- **`standard_surface`** goes through `standard_surface_to_open_pbr`, then as OpenPBR.
- **`surface_unlit`** sets `unlit`.
- **Emission:** physical (nits, exposed and metered) by default for OpenPBR, per the 2026-11-08 rule that a custom shader writes nits unless the material says `emission: "display"`. The example's toolbar has the switch, to show both.

**The material becomes a `CustomShader`** whose `fragmentMain` evaluates the pattern subgraphs and writes the material fields, with the uniform slots as its `uniforms`. Content gets it by:

- models: `ModelPlacement.setShader` (with `swap: "whenReady"`, task 2b);
- tilesets: a new `Tileset3D.setShader` (task 5a), since `customShader` is constructor-only today;
- terrain: the new globe surface hook (task 5b).

**Cesium IR is the back end** (decided at review). The lowering is IR-15 of the Cesium IR plan: the flat graph becomes a Cesium IR program through IR-1's builder, with each unconnected input a literal slot. The IR's passes do the rest:

- IR-8 turns literal slots into uniforms, so a value edit is a uniform write;
- IR-4 emits WGSL for the `CustomShader`'s `fragmentMain`, IR-5 GLSL ES for the WebGL 2 renderer;
- IR-3's float64 evaluator computes thumbnails and picks on the CPU;
- the program's hash keys the shader cache, so undo to a graph seen before costs nothing.

Closures never enter the IR: the surface binding above maps the surface node onto the material struct, outside the program. MaterialX ops map onto the vocabulary through IR-15's table; noise is IR-G4's library functions; images wait for IR-G1. A node the IR can't express yet is refused with IR-15's diagnostic, shown on the node.

**Compiles are jobs** (§13.43): a rewire's pipeline build is a cancellable `Jobs` job, and a newer edit cancels an older one, as the Cesium IR plan says for live edits.

## 6. CPU evaluation: thumbnails and picks

**Thumbnails per node.**

- Each pattern node shows a 48 × 48 swatch (96 × 96 on high-DPI screens) of its output: a float as grey, a colour as itself, a vector as its components mapped to RGB.
- **The swatch is a sphere:** each pixel has the sphere's analytic position, normal and texture coordinate, so 3D patterns read as they would on a ball and 2D ones as they would on its UVs. A toggle switches to a flat UV square.
- **One evaluation fills every thumbnail:** Cesium IR's float64 evaluator (IR-3) runs the whole program once per pixel and records each node's value. 2,304 pixels (48²) per edit, as a `Jobs` job on a worker: a newer edit cancels an older thumbnail job, and its apply step updates the swatches.
- **Budget:** under 30 ms for a 50-node graph on an M2, refreshed after the GPU update (thumbnails never delay the view). During a value drag, thumbnails downstream of the edited node refresh at 24 × 24 and sharpen when the drag ends.
- **Images** are sampled on the CPU from a decoded copy (`ImageBitmap` to pixels once per image), bilinear, matching the GPU's sampler settings.
- **Surface nodes** show no swatch; the view is their preview.
- **Why CPU and not GPU:** a GPU swatch per node would need a shader per node output, so a pipeline per node and a compile per rewire per node. The CPU path costs no pipelines, and it exercises the float64 evaluator that picks need anyway.

**Picks.**

- Click the content; the pick's `PickDomain` gives the triangle and its barycentrics. The example interpolates the inputs the graph reads (design position, normal, texture coordinate, vertex colour, named attributes) from the mesh's CPU attributes and evaluates the graph on the CPU in float64.
- **The readout** lists the selected node's output and the final material fields at that point, with a small swatch for colours. The pick's point is marked in the view, and the thumbnail of the selected node shows a dot where the point would fall on the sphere when the point's inputs are 3D.
- **Check first (task 4):** whether the mesh's texture coordinates and normals are still held on the CPU after upload, for models and for tiles. `resolveDomain` reads stored positions, so positions are held. If other attributes aren't, task 4 adds an opt-in to keep them for content whose shader asks (`CustomShader` declares that it wants CPU picks).
- **Terrain picks** evaluate at the picked point with height, slope and aspect computed from the tile's mesh and the water mask sampled from the tile's mask.
- **Later:** a GPU readback of the material fields as an AOV (renderer decisions), which would check the CPU against the GPU per pick.

## 7. Engine material: OpenPBR tiers

**Tier 1 (task 6):**

- **Emission in nits and display-relative**, as decided on 2026-11-08 and not built: `KHR_materials_emissive_strength`, the `emission` override per item or material, metering, the playground presets that need `emission: "display"`. Task 6a, first.
- **`MaterialOutput` grows** the OpenPBR fields, grouped: specular (weight, colour, IOR), coat (weight, colour, roughness, IOR, darkening, normal), thin film (weight, thickness, IOR), diffuse roughness, emission (luminance, colour). Defaults reproduce today's look exactly, so existing content and custom shaders don't change.
- **Lobes:** F82-tint conductor Fresnel; dielectric F0 from IOR with specular colour and weight; EON diffuse; a coat GGX lobe with absorption and albedo scaling; thin-film iridescence (Belcour–Barla) on both Fresnels.
- **Tables:** directional albedo of the coat GGX over (μ, roughness, IOR), as a small texture in the lighting bind group; the existing multiple-scattering table stays for the base.
- **Image-based lighting:** one more prefiltered fetch for the coat.
- **Cost control:** per-lobe feature bits in the pipeline key. A material with coat weight 0 compiles no coat code. Weights are uniforms.
- **Lobes are profile features** (engine profiles plan, added at review): coat, thin film, fuzz and anisotropy are entries in the profile catalog, so a tier or renderer that drops one says so in `view.support`, and the example's "not drawn" marks read that report.
- **Tests:** a white-furnace test (energy within 1% of the reference for each lobe alone and in layers) on the existing IBL reference path (`src/lighting/IblReference.ts`), and the default-material parity unchanged.

**Tier 2 (task 7):**

- **Fuzz:** the LTC lobe with its coefficient and albedo tables (from OpenPBR's reference, Apache-2.0), on top of the coat by albedo scaling, with an image-based term.
- **Anisotropy** for specular and coat: anisotropic GGX, and a bent-normal approximation for image-based lighting.
- **Tangents in the fragment contract:** `FragmentInput.tangent` and `bitangent` from glTF `TANGENT`, or generated (MikkTSpace on the CPU at load, opt-in by content that needs it). Also enables `tangent`, `bitangent`, `normalmap` and `bump` nodes.
- **Coat normal and tangent** as separate inputs.

**Tier 3 (not in this plan; for its own plan):**

- **Transmission:** refraction of the scene behind through a copy of the opaque colour, rough refraction from its mip chain, Beer–Lambert absorption from `transmission_color` and `transmission_depth`, thin-walled mode. It changes the render-pass order and meets the translucency path (order-independent transparency), so it needs its own design.
- **Volume scatter** (`transmission_scatter`, its anisotropy) and **dispersion** (Abbe number): approximations to choose.
- **Subsurface:** a real-time approximation (wrapped or transmitted diffuse, or screen-space), radius in scene units.
- **glTF's** `KHR_materials_transmission`, `volume`, `dispersion` and `diffuse_transmission` follow it.
- Until then the glass, honey, ketchup and soap bubble presets draw with a "needs transmission" badge.

**The WebGL 2 renderer** reports which lobes it draws. Its plan (session "plan-webgl2") decides; this plan only requires that the material's feature bits are what the support report reads.

## Tasks

No durations (owner, 2026-11-13): order and dependencies only.

### Task 1: the MaterialX document layer

- `packages/next/materialx/`: XML reader and writer, document model, `scripts/materialxDefs.mjs` and its generated table, definition resolution, flattening (steps 1–7 of section 5) with no back end.
- The package entry and the `checkBundle` rule that `src/` never imports it.
- **Assets through `npm run setup`** (owner, 2026-11-13): `scripts/materialxAssets.mjs`, after `scripts/stepSamples.mjs`. It fetches MaterialX's v1.39.5 source archive from GitHub, pinned by SHA-256, and keeps only what the example and tests use: the example materials, their images and `shaderball.glb`, each pinned too, in a store outside the repository (`~/.cesium-bench/materialx/1.39.5`, or `MATERIALX_ASSETS_DIR`), with MaterialX's licence and NOTICE beside them. The dev server serves it at `/materialx-assets/` (`serveDirectory` in `vite.config.ts`). Never committed, never bundled. Without it the stage falls back to a sphere and the presets list says what to run.
- Tests: round-trip of every v1.39.5 example material (from the store; skipped with a message when setup hasn't run), flattening of marble and brick to expected slot lists, refusal messages with line and column.

### Task 2: parameter edits on presets (needs IR-15 and IR-G4)

- **2a.** The surface binding onto today's `MaterialOutput`, and a Cesium IR program (from IR-15) to a `CustomShader`. The lowering itself is IR-15, in the Cesium IR plan.
- **2b.** Engine (needs no IR; can start at once): `setShader(next, { swap: "whenReady" })` on `ModelPlacement`, keeping the current shader until `next`'s pipelines for this content's passes are ready. A test on the fake GPU that no frame draws the default material during a swap.
- **2c.** The example skeleton (`examples/materialx-graph/`, registered in `examples/index.ts`): the stage scene with the shaderball, the presets strip, and the **material interface panel** (parameters only, no node editor). Value edits go through `setUniform`.
- **Done when:** marble, brick and wood draw on the shaderball, and every interface value edits live with no compile (the shader cache's compile count stays flat during a drag; tested).

### Task 3: the node editor and rewiring

- React Flow added (approved); the document-to-view mapping; commands with undo; the custom node component; palette with search; type-checked connections; subgraph entry; auto-layout; open, download and link.
- Rewiring through Cesium IR with swap-when-ready, the compile chip, inline errors and "not supported yet".
- All three layouts (desktop, tablet, phone) built in context, then the owner clicks around; one polish round after.
- Latency measured with the inspector recorder (section 2's targets), written into this plan.

### Task 4: thumbnails and picks

- Thumbnails as a cancellable `Jobs` job on Cesium IR's float64 evaluator, with the drag-time resolution drop.
- Picks: the CPU attribute check, the opt-in to keep attributes if needed, the readout.

### Task 5: city and terrain

- **5a.** Engine: `Tileset3D.setShader(shader, { swap: "whenReady" })`.
- **5b.** Engine: a fragment hook on the globe surface (`Globe.setShader`), with the model contract's inputs plus `height`, `slope`, `aspect`, `water`, `latitude`, `camera_distance` and the imagery colour as named inputs. The same `camera_distance` and `latitude` go to model and tileset shaders.
- **5c.** Engine: the water mask. Request quantized-mesh extension 2 (`extensions=octvertexnormals-watermask` in the `Accept` header, as 1.x does), decode the per-tile mask (one byte for all land or all water, or 256 × 256), upload it as a per-tile texture, sample it in the hook. In the format, 0 is land and 255 is water; the graph input reads 0 to 1.
- **5d.** The example's city and terrain scenes: the eleven places of section 1 with their cards, camera views and graphs, the scene-control sliders, and the frame-rate check per place. Night windows and zinc roofs wait for task 6 and show a "needs task 6" badge until then. Larger than the other parts: may split into city (5d) and terrain (5e) when it starts.

### Task 6: OpenPBR tier 1 in the engine

- **6a.** Emission in nits and display-relative (the 2026-11-08 decision), with its tests and the playground presets' `emission: "display"`.
- **6b.** The extended material, the tier 1 lobes, the coat albedo table, feature bits, the white-furnace test.
- **6c.** The OpenPBR binding moves from today's fields to the new ones; "not drawn" marks drop for tier 1 inputs.
- Independent of tasks 3–5 (different files): can run alongside them.

### Task 7: OpenPBR tier 2

- Fuzz with its tables, anisotropy, tangents in the fragment contract, coat normal and tangent. The `tangent`, `bitangent`, `normalmap` and `bump` nodes join subset A.

### Task 8: glTF material extensions onto the same model

- `gltfParse.ts` reads `KHR_materials_clearcoat`, `specular`, `ior`, `sheen`, `iridescence`, `anisotropy` and `emissive_strength` into the extended material.
- `gltf_pbr` maps one to one.
- Test content: Khronos's sample models for each extension (ClearCoatTest, SpecularTest, IORTestGrid, SheenChair, IridescenceLamp, AnisotropyBarnLamp, EmissiveStrengthTest), loaded from GitHub like the playground's.
- After task 6 (7 for sheen and anisotropy).

### Task 9: folded into IR-15

The lowering onto the core IR is IR-15 of the Cesium IR plan (decided at review). There is no emitter to delete.

### Task 10: the WebGL 2 renderer (after W7)

- The material's GLSL ES path on the WebGL 2 renderer, and its support report read by the example's "not drawn" marks.

### Task 11: checking against MaterialX's own renderer

- A dev script renders each preset in MaterialXView (in a browser, by hand or headless when the machine allows) with a matching environment and camera, saved outside the repository. A comparison by FLIP against our stage, reported per preset. Differences are expected where the engine approximates (EON against MaterialX's diffuse, real-time layering against MaterialX's); the report says which lobe each difference comes from.

## Order

The overall plan names these tasks MX-1 to MX-11 (§6, M10), with the parts that need no IR (MX-1, MX-2b, MX-5a to MX-5c, MX-6) listed first.

```text
IR-15 + IR-G4 ─┐
1 ─────────────┴─▶ 2 ──▶ 3 ──▶ 4
                         └──▶ 5 (5a, 5b, 5c can start at once; 5d needs 3)
6 ──▶ 7
6 ──▶ 8
2b, 5a, 5b, 5c, 6 and 1 can start at once; 10 after W7; 11 after 3 and 6
```

The first visible result (presets with live parameters on the stage) is task 2, once IR-15 and IR-G4 land. Until then the engine tasks and the document layer proceed.

## Risks

- **Rewire latency:** the 50–110 ms figure is per shader in the code's comment, not re-measured. Four pipelines per opaque shader made in parallel may take longer on cold drivers. Task 3 measures; the fallback is to make the colour pass's pipeline first and swap as soon as it alone is ready, with shadows following.
- **Uniform count:** a large graph may have hundreds of slots. 16 bytes each, 100 nodes × 4 inputs is 6.4 KB, well within WebGPU's 64 KB uniform binding minimum. Past that, slots move to a storage buffer.
- **The 4-texture limit** bites the tiled-material presets (brass, wood have several images). If it does, raising `MAX_TEXTURES` for material shaders or packing channels is a small engine task.
- **Noise parity** between float64 JS and float32 WGSL: the integer hash is exact, but gradients and fades round differently. Thumbnails and picks may differ from the view in the last bits; tests use tolerances.
- **Waiting on Cesium IR:** the example's first picture needs IR-15 and IR-G4 (and IR-G1 for image nodes). The engine tasks and the document layer don't, so they go first.
- **OpenPBR approximation drift:** real-time layering won't match MaterialX's reference renders exactly. Task 11 makes the differences visible and attributes them.

## Open questions for the owner

None left. Task 5d flags the tuned camera views and whether the Netherlands' heights hold up.

## Answers recorded (owner, 2026-11-13)

| Question                                       | Answer                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Which scenes?                                  | Stage, city and terrain.                                                                   |
| React Flow or our own?                         | React Flow is fine. Asked whether the official MaterialX editor is useful: see decision 8. |
| A small emitter before the core IR?            | Yes, retired when the core IR back end passes the same tests.                              |
| OpenPBR: map onto today's material, or extend? | Extend the material too.                                                                   |
| What else does OpenPBR need?                   | Section 7 lists it.                                                                        |
| How much of OpenPBR in this plan?              | Tiers 1 and 2; note tier 3 in the plan.                                                    |
| Emission units?                                | Support both display-relative and nits (the 2026-11-08 switch, which isn't built yet).     |
| glTF extensions onto the same model?           | Yes, as a milestone.                                                                       |
| Terrain inputs?                                | Hook with height, slope and aspect; and the water mask would be useful.                    |
| Vendor or fetch the MaterialX assets?          | Fetching with `npm run setup` is fine.                                                     |
| Which places?                                  | Places that look cool and show what custom terrain shading enables: section 1, "Places".   |
| At review: keep the pre-IR emitter?            | No. Lower through Cesium IR (IR-15); noise moves first in the gap order.                   |
| At review: `DOMParser` or our own reader?      | Our own reader and generated table; JsMaterialXCore only for pre-1.39 upgrades.            |
