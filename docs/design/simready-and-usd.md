# SimReady, and how USD comes in (study, 2026-11-21)

**What this holds:** CS-833's study, which answers what CS-802 needs: which SimReady profile 2.0 should target, how OpenUSD gets into the engine, and what alpha.1's seams must leave room for. It shares CS-843's spike (the owner's answer A: "a spike first, OpenUSD in WebAssembly against a TypeScript subset reader"), so it also informs CS-559. It ends in a recommendation for CS-802 and a list of follow-up items. Nothing in `packages/next/src` changed.

**What it read.** Main at `7691e1092f`. The designs for the content-source seam ([content-source-seam.md](content-source-seam.md), CS-552), semantic metadata and picking ([semantic-metadata-and-picking.md](semantic-metadata-and-picking.md), CS-832), editing ([editing.md](editing.md), CS-831) and the package map ([package-map.md](package-map.md), CS-834). The items CS-802, CS-843, CS-559, CS-672, CS-841 and CS-842. Outside pages are cited where they are used, each with the date it was read.

**What it measured.** A TypeScript subset reader, in `packages/next/spikes/usd-subset/`, run over six SimReady sample assets from NVIDIA's SimReady Foundation (Apache 2.0), and a browser page, `spikes/usdSubset.html`, that times it in a module worker. OpenUSD in WebAssembly wasn't built: that is a new dependency, and the owner's call. Its numbers here are published ones, and where nothing is published the answer is "can't tell".

**What to read first.** "The recommendation for CS-802", then "What alpha.1 must reserve". The rest is the evidence.

## The recommendation for CS-802

**Target the visual half of SimReady's Robotics-Prop profile, read-only, through a TypeScript subset reader behind the content-source seam.** That is CS-802's option A, refined by what the study found:

- **The profile:** "Minimal Placeable Visual" is no longer a profile. It is a feature, `FET001_MinimalPlaceableVisual`, inside the Robotics-Prop 5.0.0 profile. 2.0 should read what that profile's visual features require: FET001 (geometry, units, hierarchy), FET006 (UsdPreviewSurface materials), FET009 (material coverage) and FET011 (semantic labels). It shouldn't validate assets, and it shouldn't simulate. Physics (FET003) is read later, into CS-672's seam.
- **How USD comes in:** a TypeScript subset reader, as `@cesium/loader-usd`, a `whole` source with payloads by view. On these samples it reads every layer, composes every arc they use, and decodes every value the engine needs. It is about 26 KB minified, needs no threads and no `wasm-unsafe-eval`, and starts in a worker in about 12 ms. OpenUSD in WebAssembly stays possible later, as another implementation of the same source kind a host can bring. It isn't needed for SimReady's props.
- **When:** the seams' room is reserved in alpha.1 (below), because composition, units, labels and materials touch the content-source seam and the metadata path. The loader itself ships on the 0.x line outside the umbrella, as the package map already places `loader-usd`. Physics, MDL and sensors stay out of 2.0.0.

The options, as CS-802 put them, with what the study changes:

- **A. The visual half of Robotics-Prop, through the subset reader** (_recommended_). Six to eight items (below). The reader needs a stated list of what it refuses, and this note starts it.
- **B. A, plus UsdPhysics read into CS-672.** Every sample but one carries rigid bodies, mass, colliders and physics materials, and one carries revolute joints with drives. Reading them is cheap for the reader. The cost is CS-672's: a seam that takes physics in, not only hands it out.
- **C. Conversion on a server only.** No converter found carries `SemanticsLabelsAPI` or UsdPhysics into glTF (below), so labels and physics would be lost unless 2.0 writes its own converter, which is the subset reader's work again, on a server.
- **D. Not a target for 2.0.** Nothing now; a later start fits around a frozen seam. The spike shows the reader is small, so the saving is small.

CS-843 can be answered from the same evidence: the subset reader, with OpenUSD in WebAssembly as a later, optional module. That answer is the owner's.

## SemanticsAPI or SemanticsLabelsAPI in the samples

CS-832 asked whether SimReady's samples still use Isaac's older `SemanticsAPI`. Some do. Of the six assets read:

| Asset (SimReady Foundation sample) | Schema                                            | Taxonomies and example labels                                                                                                             |
| ---------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `alcohol_a01`                      | `SemanticsLabelsAPI`                              | `wikidata_class` ("bottle"), `wikidata_qcode` ("Q80228"), and `material` ("Q11469") on its materials                                      |
| `apple_a01`                        | `SemanticsLabelsAPI`                              | `wikidata_class` ("apple"), `wikidata_qcode` ("Q89"), `material`                                                                          |
| `obs_lamp_revolute_a01`            | `SemanticsLabelsAPI`                              | `wikidata_class` ("lamp"), `wikidata_qcode` ("Q1138737"), `material` ("steel", "aluminum", "plastic")                                     |
| `copper_brushed` (a material)      | `SemanticsLabelsAPI`                              | `material` (12 tags), and version tags such as `OpenPBR_Ver` on the material prim                                                         |
| `industrialplasticpallet_a01`      | Isaac's `SemanticsAPI`, 7 instances, no new label | `class` ("pallet", "prop_general"), `qcode`, `hierarchy`, `anchorTag`, `labelTag`, `prop_general_type`; instance names are random strings |
| `traffic_cone_chn_red` (splats)    | none                                              | none                                                                                                                                      |

The newer samples (generated 2026-03, per their layers' metadata) use only `SemanticsLabelsAPI`. The older pallet uses only `SemanticsAPI`. The SimReady Foundation now requires the new schema and deprecates the old one: SL.001 requires an authored `SemanticsLabelsAPI` label on all renderable geometry, from the prim, an ancestor, its bound material or a `GeomSubset`; SL.002 passes an old `SemanticsAPI` label only with a warning, when a matching new label exists, and fails otherwise; SL.003 names the taxonomy `wikidata_qcode` (https://nvidia.github.io/simready-foundation/latest/rules_and_reqs/semantic_labels/requirements/semantic-label-capability.html, `…/semantic-label-deprecated-schema.html`, `…/semantic-label-schema.html`, read 2026-11-21).

**How the engine reads each:**

- **`SemanticsLabelsAPI:<instance>`:** as CS-832 designed. The instance name is the taxonomy; `semantics:labels:<instance>` is a token array of labels. The spike reads both from USDA and USDC.
- **Isaac's `SemanticsAPI:<instance>`:** the taxonomy is `semantic:<instance>:params:semanticType`, and the label is `semantic:<instance>:params:semanticData`. CS-832's mapping holds, with one addition the pallet shows: several instances can share one `semanticType` (two give `class`), so their labels join into one set in that taxonomy. The instance name carries no meaning and is dropped. This matches how SL.002's migration maps the old schema.
- **Labels on materials.** SL.001 lets a label come from the bound material, and the samples put `material` labels on Material prims. CS-832's precedence (host, feature, content, ancestor, item) has no step for "its bound material". That is a reservation below.
- **The default taxonomy.** CS-832 chose `class`, after Omniverse Replicator. No new SimReady sample uses `class`: they use `wikidata_class` and `wikidata_qcode`. So the USD source needs a small alias table (below), or SimReady assets have no default-taxonomy labels.

## Which profile

**What changed in SimReady's model.** The SimReady Foundation now has four kinds of contract: requirements, capabilities (`CAPnnn`), features (`FETnnn`) and profiles. "Minimal Placeable Visual" is a feature, `FET001_MinimalPlaceableVisual`, used by the Robotics-Prop, Robot-Body, Robot-Gripper and AIF-Entity profiles. Names such as "Prop-Robotics-Physx" survive only in the change list. The current release is 2026.10.0. No profile is visual-only (https://nvidia.github.io/simready-foundation/latest/profiles/profiles.html; https://github.com/NVIDIA/simready-foundation, `VERSION.md`, `changelist.md`; read 2026-11-21). The older pallet's metadata names "Prop-Robotics-Neutral", one of those older names, which shows assets in circulation follow several versions.

**Robotics-Prop 5.0.0** requires the features FET008_ObjectForward 0-1-0, FET001_MinimalPlaceableVisual 1-0-1, FET003_RigidBody 0-2-0, FET006_Materials 0-3-0 (UsdPreviewSurface), FET009_MaterialCoverage 0-1-0, FET011_SemanticLabels 0-2-0 and FET011_SemanticLabels.RTX 0-1-0, and the capabilities CAP000_Core 0-2-0, CAP046_WikidataLabels 0-1-0, CAP031_SelfContainedPackage 0-1-0 and CAP033_SimReadyPackage 0-4-0. MDL and OpenPBR materials are optional features (https://github.com/NVIDIA/simready-foundation/blob/main/nv_core/tiers/simready_foundation_tier_core/simready/foundation/tier_core/profiles/robotics_prop.toml, read 2026-11-21).

**The recommendation: read what Robotics-Prop's visual features require.** That is FET001, FET006, FET009 and FET011, over CAP000. The engine reads assets that conform; it doesn't check that they do. Assets that don't conform still load where the reader can, with refusals by name.

The rules, each from its page under https://nvidia.github.io/simready-foundation/latest/rules_and_reqs/ (written `…/` below), all read 2026-11-21. The last column is what the engine does with each.

| Rule        | What it requires                                                                                   | Source                                                                          | What the USD source does (CS-559)                                                     |
| ----------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| AA.001      | Asset paths are anchored (`./`, `../`), never absolute or search paths                             | `…/core/atomic_asset/requirements/anchored-asset-paths.html`                    | Resolves anchored paths through the fetch provider; refuses others by name            |
| AA.002      | File types: usda, usdc, usd, usdz; png, jpeg, exr; m4a, mp3, wav                                   | `…/core/atomic_asset/requirements/supported-file-types.html`                    | Reads the USD and image types; audio is ignored                                       |
| UN.006      | `upAxis` is "Z"                                                                                    | `…/core/units/requirements/upaxis-z.html`                                       | Reads any axis, and corrects through placement (below)                                |
| UN.007      | `metersPerUnit` is 1.0                                                                             | `…/core/units/requirements/meters-per-unit-1.html`                              | Reads any value, and scales through placement                                         |
| VG.MESH.001 | All geometry is non-subdivided `UsdGeomMesh`; no subdivision surfaces, curves, points or implicits | `…/visualization/geometry/requirements/geom-shall-be-mesh.html`                 | Draws meshes; skips curves, points and implicit shapes by name for now                |
| VG.002      | Boundable prims have valid extents                                                                 | `…/visualization/geometry/requirements/usdgeom-extent.html`                     | Uses extents for bounds before payloads load                                          |
| VG.008      | Meshes don't share the exact same space (the feature's text calls it extent conformance)           | `…/visualization/geometry/requirements/usdgeom-mesh-coincident.html`            | Nothing: a validation rule                                                            |
| VG.014      | Valid mesh topology                                                                                | `…/visualization/geometry/requirements/usdgeom-mesh-topology.html`              | Refuses a mesh whose counts and indices disagree                                      |
| VG.029      | Counterclockwise winding                                                                           | `…/visualization/geometry/requirements/usdgeom-mesh-winding-order.html`         | Reads `orientation`; flips "leftHanded" meshes                                        |
| VG.025      | The origin sits at the base center, or the rotation center for hinged objects                      | `…/visualization/geometry/requirements/asset-origin-positioning.html`           | Nothing: it makes placement predictable                                               |
| VG.027      | Meshes have normals; `primvars:normals` preferred, one representation only                         | `…/visualization/geometry/requirements/usdgeom-mesh-normals-exist.html`         | Reads either, `primvars:normals` first                                                |
| VG.028      | Normals are valid: sizes match interpolation, unit length, no NaN, outward                         | `…/visualization/geometry/requirements/usdgeom-mesh-normals-must-be-valid.html` | Trusts them; computes normals only when none exist                                    |
| HI.001      | One root prim (an injected `/Render` scope is exempt)                                              | `…/hierarchy/requirements/hierarchy-has-root.html`                              | The default prim is what a scene item places                                          |
| HI.003      | The root prim is Xformable                                                                         | `…/hierarchy/requirements/root-is-xformable.html`                               | Its transform composes under the item's placement                                     |
| HI.004      | The stage has a `defaultPrim`                                                                      | `…/hierarchy/requirements/stage-has-default-prim.html`                          | Opens the default prim; without one, the first root prim, with a warning              |
| NP.007      | All references are relative                                                                        | `…/core/naming_paths/` (CAP000)                                                 | As AA.001                                                                             |
| NP.008      | Every asset, reference and payload path resolves                                                   | `…/core/naming_paths/` (CAP000)                                                 | A missing layer is reported by path; the rest composes                                |
| HI.010      | No undefined prims (`over` with no `def`)                                                          | `…/hierarchy/requirements/undefined-prims.html`                                 | Draws nothing for them                                                                |
| VM.PS.002   | Each renderable prim's material connects a UsdPreviewSurface to `outputs:surface`                  | FET006, `…/visual_materials/`                                                   | UsdPreviewSurface is the first choice (below)                                         |
| VM.BIND.001 | A binding inside a payload targets a material inside that payload                                  | FET006                                                                          | Lets a payload's materials load with it                                               |
| VM.TEX.001  | Textures are at most 16,384 px per axis                                                            | FET006                                                                          | WebGPU guarantees 8,192 px; larger needs the device's higher limit, or is downsampled |
| VM.TEX.003  | `sourceColorSpace` matches how the input reads the image                                           | FET006                                                                          | Reads `sourceColorSpace` ("sRGB", "raw", "auto")                                      |
| VM.MAT.001  | Every renderable prim resolves a material                                                          | FET009                                                                          | Its fallback is the display color, then a neutral material                            |
| SL.001–003  | Labels as above                                                                                    | FET011, links above                                                             | As in the section above                                                               |

CAP000_Core 0-2-0 also has NP.002 to NP.005 (file naming, folders, path length, one USD file per asset folder), which are packaging rules the engine doesn't need. FET001's own page lists its rules (https://nvidia.github.io/simready-foundation/latest/features/FET001_MinimalPlaceableVisual.html, and the JSON at https://github.com/NVIDIA/simready-foundation/blob/main/nv_core/tiers/simready_foundation_tier_core/simready/foundation/tier_core/features/FET001_MinimalPlaceableVisual.1-0-1.json, read 2026-11-21). FET006 and FET009's rules are from their feature files in the same folder.

**What the next features add,** for later items:

- **FET003_RigidBody 0-2-0:** at least one rigid body; bodies are Xformable and not inside instances; mass on the body or its colliders; no skew; invisible colliders use `purpose = "guide"`; `CollisionAPI` on colliding prims, `MeshCollisionAPI` only on meshes (RB.001 to RB.010, RB.COL.001 to RB.COL.004). Runtime tests drop the asset on the ground and a slope.
- **FET006_Materials.MDL 0-3-0 (optional):** anchored `.mdl` files that exist, `outputs:mdl:surface`, no deprecated `mdlMaterial`.
- **CAP007_NonVisualMaterials 0-2-0 (optional):** non-visual material attributes for sensors (NVM.001 to NVM.006).
- **NuRec 1.0.0** is a separate profile for neural reconstructions. The traffic cone sample is one: a single `ParticleField3DGaussianSplat` prim.

## How USD comes in: three paths

| Path                                      | Size                                                                                               | Start time                                                            | Coverage of SimReady's visual features                                                               | Threads and CSP                                                               | Upkeep                                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| A. OpenUSD built for WebAssembly          | 19.7 to 36.4 MB of `.wasm` (3.35 to 5.49 MB with Brotli) in one published build; "70MB" in another | Can't tell: no build here, and no source measures it                  | All of composition and every schema; MaterialX and UsdImaging excluded by Pixar's own wasm target    | Needs pthreads, so cross-origin isolation (COOP and COEP); `wasm-unsafe-eval` | A C++ build with emscripten and oneTBB, rebuilt for each OpenUSD release; large and slow to build                 |
| B. A TypeScript subset reader (the spike) | 26,246 B minified, 9,625 B with gzip, 8,678 B with Brotli                                          | 11 to 13 ms from `new Worker` to the module loaded, on the dev server | Every layer and arc in six samples; every value the engine needs; refusals by name for what it skips | None: no threads, no `SharedArrayBuffer`, no eval                             | About 2,300 formatted lines (readers and composer) to own; the crate format has a public specification since 2025 |
| C. Conversion on a server                 | Nothing in the client                                                                              | The server's conversion time per asset, then a glTF load              | Geometry and UsdPreviewSurface materials; no converter found carries labels or physics               | Not the client's                                                              | A service to run, or a host's; a converter of 2.0's own to keep labels, which is path B's work on a server        |

**A. OpenUSD in WebAssembly.** Pixar's OpenUSD builds for WebAssembly since 26.03 (2026-02-24), which "Added support for pxr/usd libraries and tests under wasm32 and wasm64", after 25.11 built only `pxr/base`. The flag is `--build-target wasm` (or `wasm64`), which builds static libraries in monolithic mode and no command-line tools. In v26.11.1, `build_usd.py` refuses `--python`, `--tools`, `--materialx`, `--usd-imaging` and `--usdValidation` for wasm, forces oneTBB on, and links with `-pthread` (https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/v26.11.1/CHANGELOG.md; https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/v26.11.1/build_scripts/build_usd.py; https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/release/README.md; read 2026-11-21). Its sample resolver serves pages with COOP and COEP "due to the use of -pthread" (https://github.com/PixarAnimationStudios/OpenUSD/tree/v26.11.1/extras/usd/examples/wasmFetchResolver, read 2026-11-21).

Builds others publish:

- **Needle's `@needle-tools/usd`** (OpenUSD 26.11.1 with MaterialX and UsdImaging): 36,449,321 B with Asyncify or 19,699,280 B with JSPI, "3.35 MB instead of 5.49 MB with Brotli"; threaded; PolyForm Noncommercial 1.0.0, so not usable here (https://github.com/needle-tools/usd-viewer/blob/main/usd-wasm/README.md, read 2026-11-21).
- **Autodesk's fork:** "the wasm package has 70MB size, it could be smaller", and a 4 GB memory limit (https://raw.githubusercontent.com/autodesk-forks/USD/adsk/feature/wasm/README.md, read 2026-11-21).
- **LightUSD** (formerly TinyUSDZ): a C++17 reader of USDA, USDC and USDZ with LIVRPS composition, no threads in WebAssembly, Apache 2.0, first stable release 1.0.0 in 2026-11. Its README states 1,671,646 B for the core `.wasm`, but the `.wasm` in its npm package 1.0.0 is 7,104,000 B; the two disagree, and this study didn't build it (https://github.com/lighttransport/LightUSD/blob/main/web/README.md; https://unpkg.com/lightusd@1.0.0/?meta; read 2026-11-21). It is a fourth path between A and B: a smaller C++ reader in WebAssembly.
- **Every one of these needs `wasm-unsafe-eval`** under a strict CSP, as any WebAssembly does (https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/script-src, read 2026-11-21). Their JavaScript glue also builds functions with `new Function`, which needs `unsafe-eval` unless rebuilt with `-sDYNAMIC_EXECUTION=0`. That is a reading of the files' text, not the projects' statement.

**Start time for A: can't tell.** No build exists here, and no published source measures one: not the module's compile, nor OpenUSD's plugin registry and schema setup after it. Building it to measure needs the OpenUSD sources and oneTBB; the emscripten toolchain (emsdk 7.0.0) is already in the setup store for SMLib. That build is a question for the owner below.

**B. The subset reader.** What the spike built and measured is the next section. Two outside facts bear on its upkeep:

- **The crate format has a public specification:** the AOUSD Core Specification 1.1.0 (2026-08-13) documents it, LZ4 and the integer coding included, and requires readers to support crate versions 0.8.0 to 0.13.0 (https://github.com/aousd/specifications-public/blob/main/core/1.1.0/core_spec.md, read 2026-11-21). The specification's LZ4 chunk header (a u64 count) disagrees with OpenUSD's code (one byte, then an int32 size per chunk) (https://github.com/PixarAnimationStudios/OpenUSD/blob/v26.11.1/pxr/base/tf/fastCompression.cpp, read 2026-11-21). The spike follows the code; every sample's buffers are one chunk, so the samples don't tell the two apart. One sample layer is crate 0.7.0, older than the specification's range, and the spike reads it.
- **three.js reads USDC since r183** (2026-02-20), with its own LZ4 and integer decoders, and composes references, payloads and variant sets only inside one USDZ (https://github.com/mrdoob/three.js/blob/dev/examples/jsm/loaders/usd/USDComposer.js, read 2026-11-21). So a subset reader in JavaScript is an approach others ship, though three.js's doesn't compose across files, which SimReady's samples need.

**C. Conversion on a server.** Omniverse's asset converter writes glTF, with "Only OmniPBR, UsdPreviewSurface, and specified gltf.mdl" materials, and mentions neither physics nor semantics (https://docs.omniverse.nvidia.com/extensions/latest/ext_asset-converter.html, read 2026-11-21). `usd2gltf` (MIT, last released 2023) and Adobe's glTF file-format plugin don't carry them either. glTF's physics extensions, `KHR_physics_rigid_bodies` and `KHR_implicit_shapes`, are still open pull requests (https://github.com/KhronosGroup/glTF/pull/2424, https://github.com/KhronosGroup/glTF/pull/2370, read 2026-11-21). So conversion loses what makes an asset SimReady. It stays right for B-reps (CS-305's tiler) and for hosts that already run a pipeline.

## What the spike measured

**The spike.** `packages/next/spikes/usd-subset/`: an LZ4 and integer decoder, a USDC reader, a USDA reader, a USDZ reader, a composer, a coverage report and a fixture. `run.ts` runs it in Node over a data folder; `size.mjs` bundles it; `spikes/usdSubset.html` times it in a worker. Its README says how to run each and states the data, settings and costs.

**The data.** Six asset folders from NVIDIA's SimReady Foundation repository at commit `1abf3ae2e9a0ae2ccad8c8632065621c9e08f2ef`, `sample_content/common_assets/`, each asset's `simready_usd/` folder without thumbnails, 77 MB in all. NVIDIA's content in that repository is Apache 2.0, which allows this use (https://github.com/NVIDIA/simready-foundation/blob/main/LICENSE.txt, read 2026-11-21). Its listed exceptions (Robotiq, UR10, Spot, and the OmniPBR MDL files under BSD 3-Clause) aren't among the six, except OmniPBR's MDL files, which the spike only checks exist. They are kept in the setup store at `~/.cesium-bench/simready/foundation-1abf3ae2/`, outside the repository. Nothing from them is committed.

Larger sets exist and weren't used: `nvidia/simready-assets` on Hugging Face (1,000 assets, about 89.6 GB, CC BY 4.0, https://huggingface.co/datasets/nvidia/simready-assets, read 2026-11-21) and `nvidia/PhysicalAI-SimReady-Warehouse-01` (about 11.3 GB, CC BY 4.0). CC BY 4.0 allows use with attribution.

**The settings.** Node 24.19.0 on the Mac test machine, seven runs per asset, the median reported. It is a quick probe, not a Dyno run: no Dyno instrument times a Node parser, and adding a Lab harness would change `bench/`, outside this item. The machine was busy (load average about 14 on 8 cores), so the times are rough upper bounds. "Read" is reading and parsing every layer from disk; "compose" is composing the stage.

| Root layer                                  | Layers | MB   | Crate versions | Read, ms | Compose, ms | Prims | Meshes | Triangles | Size, m               | Missing layers |
| ------------------------------------------- | ------ | ---- | -------------- | -------- | ----------- | ----- | ------ | --------- | --------------------- | -------------- |
| `copper_brushed.usda` (a material)          | 2      | 0.06 | none (USDA)    | 1.2      | 1.7         | 52    | 0      | 0         | none                  | 0              |
| `sm_alcohol_a01_01.usd`                     | 12     | 1.15 | 0.8.0          | 2.7      | 1.0         | 24    | 1      | 10,252    | 0.045 × 0.045 × 0.155 | 0              |
| `sm_apple_a01_01.usd`                       | 12     | 1.06 | 0.8.0          | 2.1      | 0.8         | 24    | 1      | 9,414     | 0.075 × 0.075 × 0.075 | 0              |
| `industrialplasticpallet_a01.usd`           | 6      | 7.14 | 0.7.0, 0.8.0   | 12.8     | 0.4         | 13    | 1      | 97,136    | 1.222 × 1.018 × 0.150 | 2              |
| `industrialplasticpallet_a01_base.usd`      | 4      | 7.14 | 0.7.0, 0.8.0   | 6.5      | 0.3         | 11    | 1      | 97,136    | 1.222 × 1.018 × 0.150 | 1              |
| `industrialplasticpallet_a01_inst.usd`      | 3      | 7.13 | 0.7.0, 0.8.0   | 13.3     | 0.2         | 8     | 1      | 97,136    | 1.222 × 1.018 × 0.150 | 1              |
| `industrialplasticpallet_a01_inst_base.usd` | 2      | 7.13 | 0.8.0          | 8.9      | 0.1         | 8     | 1      | 97,136    | 1.222 × 1.018 × 0.150 | 1              |
| `sm_obs_lamp_revolute_a01_01.usda`          | 12     | 2.99 | 0.8.0          | 7.5      | 2.4         | 55    | 4      | 50,282    | 0.052 × 0.073 × 0.103 | 0              |
| `sm_traffic_cone_chn_red_01.usd` (splats)   | 1      | 2.34 | 0.8.0          | 2.4      | 0.01        | 1     | 0      | 0         | none (no meshes)      | 0              |

- **Sizes** are the bounds of every mesh's points through the composed transforms, times `metersPerUnit`. They weren't checked against OpenUSD, so they show units and transforms are read, not that they're right to the millimeter.
- **Missing layers** are the pallet's references outside its own folder (a thumbnail rig and a shared physics material), which the download didn't include. The reader reports them by path and composes the rest, as NP.008 expects of a broken asset.
- **What it didn't decode:** dictionary values (`customData`, `assetInfo`) and one `layerOffsetVector`. Neither matters to drawing. Every array, token, path, list op, reference, payload and variant selection in the six assets decoded.

**The fixture.** Four USDA layers in `fixture.ts` exercise a sublayer, an external reference, a payload, a variant set with a selection, an inherit from a class in a sublayer, both label schemas and a material with UsdPreviewSurface and MDL. Six checks against answers worked out by hand all pass. CS-559's fixture can start from it.

**In a browser.** `spikes/usdSubset.html` on the dev server (port 4102), Chrome in the app's browser pane, ten runs, the median: a module worker starts and loads the reader in 11 to 13 ms (three runs of the page), composes the fixture in 3.4 to 3.8 ms cold, and the main thread composes it in 0.3 to 0.5 ms warm. The page wasn't cross-origin isolated, and the reader didn't need it. The dev server serves unbundled modules, so a built page would start faster. The page also opens a local SimReady folder and lists what it read; that path isn't timed.

**What the samples use, read by the spike:**

- **Units and axes:** every asset is `upAxis = "Z"` and `metersPerUnit = 1`, as UN.006 and UN.007 require, except the material library, which sets neither. None sets `kilogramsPerUnit`, so mass is in kilograms by USD's default.
- **Composition:** sublayers, references (1 to 15 per asset) and variant sets in every prop; one payload (the pallet). No inherits, specializes or relocates. The props' physics comes from a sublayer and per-runtime variant sets (`PhysX`, `Newton`, `MuJoCo`), each selected "Disabled" by default; the pallet's `PhysicsVariant` set selects "RigidBody" or "None". Instanceable prims: 2 in each fruit and bottle, 10 in the lamp.
- **Geometry:** meshes only, all `subdivisionScheme = "none"`, with normals and UVs; the lamp has 3 `GeomSubset`s. The newer props each also have a `BasisCurves` prim, a grasp marker, which VG.MESH.001's "no curves" and the asset disagree on. Three to six transform operations per newer prop are declared with no value, which the spike reads as identity, as OpenUSD does.
- **Materials:** the newer props have UsdPreviewSurface, MDL (`OmniPBR.mdl`) and a MaterialX OpenPBR network side by side; the lamp has 6 materials with UsdPreviewSurface and MDL. The pallet's 2 materials are MDL only (`Plastic_Rough_Black_A.mdl`, `Plastic_Blue_A.mdl`). The copper material is a MaterialX OpenPBR network of 51 shaders with a UsdPreviewSurface beside it.
- **Physics:** rigid bodies, mass, colliders and physics materials in every prop; three revolute joints with angular drives and `convexDecomposition` colliders in the lamp. No PhysX-specific schemas.
- **Splats:** the traffic cone is one `ParticleField3DGaussianSplat` prim with 9,919 splats: positions, orientations, scales, opacities and degree-3 spherical harmonics (16 coefficients each), all decoded.

**What the reader refuses or leaves out today,** the start of CS-559's list: crate versions before 0.4.0; time samples (counted, not read); value clips; relocates; layer offsets on time; variant fallbacks; `!invert!` transform operations; and dictionary values. Instanceable prims are composed in place rather than shared as prototypes. Arcs to URLs or search paths are reported unresolved.

## What alpha.1 must reserve

Each is a place in a seam that alpha.1 freezes, and what it must leave room for. Nothing here asks a seam to change shape; it asks for named room.

**Composition and variants.**

- Composition happens inside the USD source, not in the engine. The engine sees composed prims written to sinks, as CS-552 has it. So the seam needs nothing for layers, references or inherits.
- **Variant selections are open options.** A host must be able to choose a variant when it opens a stage (SimReady's physics variants, a color, a level of detail), and later change it. Reserve `AssetRef.options.variants` (a map from prim path and set to selection), and treat a change as an `invalidate` push of that prim's subtree. CS-832 already makes a variant that changes a path change the ID.
- **Payloads load by view,** as CS-552's `whole` source already allows. Reserve a load policy in the options (all, none, by view), because a host making a dataset wants all of them and a viewer wants few.
- **Instanceable prims** should become instances through `DrawSink`, one mesh drawn many times. Reserve that a source can write one mesh with several placements and still give each instance its own stable ID (prim path plus instance), as CS-832 already does for point instancers.

**Stage units and axes.**

- A stage declares `upAxis`, `metersPerUnit` and `kilogramsPerUnit`. SimReady fixes the first two, but USD in general doesn't, and a referenced layer can disagree with the stage that references it.
- **Reserve that a source declares its own axis and scale** in its extent or placement, as the package map's declared-placement contract does for 3D Tiles' georeference. The engine corrects through the scene item's placement, never by rewriting vertices, so a pick still answers in the source's own units.
- **Correction between layers** (a Y-up reference inside a Z-up stage) is the source's, inside composition, because the engine never sees layers.
- **`kilogramsPerUnit`** goes with physics. CS-672's seam should carry mass with its unit.

**UsdPreviewSurface and MDL fallbacks.**

- **The order:** UsdPreviewSurface on `outputs:surface` first, which SimReady requires (VM.PS.002); MaterialX on `outputs:mtlx:surface` (OpenPBR through CS-475 and CS-418) when the material system has it; MDL never compiled in the engine. Where a material is MDL only, as the pallet's are, the engine falls back to `primvars:displayColor`, then a neutral material, and says which material and which MDL module it couldn't draw.
- **Reserve in the material system** a record of what a source's material resolved to: which output was used, which were present and skipped, and the fallback used. Hosts that render MDL themselves (Omniverse's RTX) need to know, and so does a person asking why a pallet is grey.
- **Textures:** `sourceColorSpace` read per texture, and a downsampling path for textures larger than the device's limit (VM.TEX.001 allows 16,384 px).

**Labels through CS-832.**

- **The bound material as a level in the precedence.** SL.001 and the samples put labels on Material prims. CS-832's order (host, feature, content and ancestors, item) needs one step: a feature's own labels, then its bound material's, then its ancestors'. Reserve it in CS-815's resolution before alpha.1, because changing the order later changes every semantic image.
- **Taxonomy aliases.** SimReady uses `wikidata_qcode` and `wikidata_class`, not `class`. Reserve an alias table in a source's taxonomy declaration (`{ class: "wikidata_class" }`), which the USD source fills by default for SimReady assets. Then CS-832's default taxonomy works on them without the host naming one.
- **Isaac's older schema** maps as CS-832 has it, joining several instances with one `semanticType` into one set.
- **`GeomSubset` labels** (allowed by SL.001) need a sub-feature ID: a mesh's faces split by subset. CS-815's IDs should allow it (prim path plus subset name), even if alpha.1 doesn't draw it.

**UsdPhysics for CS-672.**

- The samples declare rigid bodies, mass, colliders with approximations, physics materials, joints and drives. CS-672 designs representations the engine hands simulators; SimReady assets come with theirs.
- **Reserve that CS-672's seam takes declared physics in,** keyed by stable ID, as plain rows: body, mass and its unit, collider shape or approximation, material, joint and its frames. A source writes them; the engine stores and hands them out. Derived representations (hulls, SDFs) are for content that declares none.
- **Variants decide which runtime's physics applies.** The samples select "Disabled" by default, so a source that reads physics should follow the composed selection and let the host choose one.
- None of this is in alpha.1's code. It needs room in CS-672's design, which hasn't been written.

**Splats, which the study found.** SimReady's NuRec profile and the traffic cone sample put Gaussian splats in USD. Reserve that the USD source can write custom rows for a registered render feature (CS-552's `RenderFeature`, public from alpha.1 by CS-841's answer), so the splat renderer draws them, and CS-832's 0.5 opacity rule picks them.

## Follow-up items

For the main session to file, with kind, project and needs. Each waits on CS-802's answer except the first two.

1. **work, CS-191: "CS-559's scope: the subset reader as its runtime, from CS-833's spike".** Rewrite CS-559's done-when around the reader: USDA, USDC and USDZ, the composition list, the refusal list above, payloads by view, and the fixture. Needs CS-802, CS-843.
2. **work, CS-191 (with CS-815): "Label precedence: the bound material, taxonomy aliases and GeomSubset IDs".** Needs CS-832's decisions; before alpha.1.
3. **work, CS-191: "Source-declared axis and scale, corrected through placement".** With the package map's declared-placement contract. Before alpha.1.
4. **work, the material project: "What a source's material resolved to: UsdPreviewSurface first, then MaterialX, MDL refused by name".** Needs CS-475.
5. **work, CS-191: "Variant selections and payload policy as open options, and their change as invalidation".** Before alpha.1.
6. **proposed, CS-193: "UsdPhysics read into CS-672's seam".** Needs CS-672 and CS-802 (option B).
7. **proposed, the splat project: "Gaussian splats from USD's ParticleField into the splat render feature".** Needs the splat render feature.
8. **proposed, the benchmark project: "SimReady samples in the setup store, with their licenses, and a Dyno instrument for the USD reader".** Moves this spike's timings into Dyno. Needs the owner's yes to store the samples (Apache 2.0) through setup.

## Questions for the owner

- **Build OpenUSD for WebAssembly, for the spike only?** It is the one way to replace "can't tell" with a start time for path A. It needs the OpenUSD 26.11.1 sources and oneTBB, built outside the repository with the emsdk already in the setup store; nothing would ship. _Recommended: no_, unless CS-802's answer is B or a host needs full USD: the subset reader covers the samples, and A's size and threading costs are known without it.
- **LightUSD as the reader instead of our own?** Apache 2.0 and no threads, but its size can't be told (1.6 MB or 7.1 MB, by two of its own sources), it needs `wasm-unsafe-eval`, and it adds a C++ build. _Recommended: no for now;_ keep it as the fallback if the TypeScript reader's upkeep grows.

## Risks

- **Untrusted files.** A crate file states its own sizes, and the spike allocates what they say. A shipped reader needs limits on allocation and on composition depth, and runs in a worker. LightUSD's advice for hostile assets is the same.
- **The specification and the code disagree** on the LZ4 chunk header. A reader written from the specification alone would fail on buffers over about 2 GB, or on files OpenUSD writes in several chunks. Test against files OpenUSD writes.
- **SimReady moves quickly.** Its profiles were renamed and renumbered within 2026, and assets in circulation follow several versions (the pallet's "Prop-Robotics-Neutral"). The engine should read what assets carry, not check them against one version.
- **Composition beyond the samples.** Pixar's own scenes use relocates, value clips and time-offset layers, which the subset refuses. The refusal list is the honest boundary, and path A stays possible for hosts that need it.
