# Three USD readers compared (CS-900, 2026-11-22)

**What this holds:** CS-900's measurement of three ways to read USD in the browser, over the same six SimReady samples: the TypeScript subset reader from CS-833's spike, LightUSD 1.0.0 in WebAssembly, and Pixar's OpenUSD 26.11.1 in WebAssembly. It gives CS-901 (which reader CS-559 uses) its options and a recommendation. It follows [simready-and-usd.md](simready-and-usd.md) (CS-833), and CS-802's answer B: Robotics-Prop 5.0.0's visual features (FET001, FET006, FET009, FET011) plus UsdPhysics. Nothing in `packages/*/src` changed.

**What to read first.** "The recommendation for CS-901", then the table under it. The rest is the evidence.

**Changed on 2026-11-22 (CS-913).** CS-901 chose the subset reader (answer A), and CS-913 fixed the composition faults this comparison found. The subset reader now agrees with OpenUSD on 82 of 82 non-empty checks (it was 79), the pallet included, and reports a failed reference as OpenUSD does. The figures below are the rerun's where they say so ("Rerun after CS-913"); LightUSD's and OpenUSD's are unchanged, and the start times stay those of the first run.

**Where the evidence is.** One Dyno instrument, the Lab harness `usdReaders` (`bench/usdReaders.html`, served by `spikes/usd-readers/serve.mjs`), listed in Dyno's instrument catalog (`bench/suite/instruments.mjs`) as `usdReaders`. Its run is `2026-11-22T10-56-32-200Z-apple-metal-3` (a Lab run, measured through `dyno measure start lab usdReaders`, handle `m-2026-11-22T08-48-26-917Z-426a`, started on a quiet machine at 10:56Z). Its results file is kept in the setup store beside the builds. The spike's README says how to run it. The builds and the samples stay in the setup store; nothing built is committed, and no reader became a dependency.

## The recommendation for CS-901

**Keep the TypeScript subset reader as CS-559's runtime, fix the two composition faults this comparison found (done by CS-913, see "Rerun after CS-913"), and keep OpenUSD in WebAssembly as the test oracle, not as something the engine ships.** LightUSD stays the fallback if the subset reader's upkeep grows.

- **The subset reader** is the smallest (9,152 B with Brotli), the fastest to start (15 to 28 ms, median per sample), asks nothing of the host page, and agrees with OpenUSD on every check on five of the six samples, physics included. On the broken sample it got three facts wrong, from two faults, which CS-913 fixed: it now agrees on all six (82 of 82 non-empty checks). Its cost is that we own it: about 2,300 lines, and a refusal list (relocates, value clips, time offsets) that these samples don't exercise.
- **OpenUSD** is right on every check, as the reference should be, but it costs 1.7 MB with Brotli, 138 to 153 ms to start, and a cross-origin isolated host page, because it needs threads. The last is the deciding cost for an embeddable core: every host page that embeds the engine would have to send COOP and COEP, and every cross-origin resource on it would need CORP or CORS. It earns its place as the oracle in Dyno and in CS-559's tests, and as a source a host can bring when it needs full USD.
- **LightUSD** needs no threads and agrees with OpenUSD on every check of the five samples it opens, but it is 817 KB with Brotli (about 90 times the subset reader), starts in 42 to 70 ms, and refuses a stage outright when a layer it references is missing, where USD composes the rest. Its C++ build needed a fix under the current emscripten. It is the right fallback if hosts come to need composition the subset reader refuses, and its refusal on broken assets would need raising with its maintainers first.

So CS-901's options, from this evidence:

- **A. The subset reader** (_recommended_), with CS-559's fixtures checked against OpenUSD in Dyno.
- **B. LightUSD in WebAssembly:** no threads; about 90 times the bytes and 3 times the start time; a C++ toolchain to keep; refuses broken assets.
- **C. OpenUSD in WebAssembly:** the reference; 190 times the bytes, 8 times the start time, and cross-origin isolation for every host page.

## The three readers side by side

| Reader                        | Size, Brotli (raw)         | Start, median per sample                 | Agrees with OpenUSD (82 non-empty checks of 126) | Page must allow                                         | License                     | Upkeep                                              |
| ----------------------------- | -------------------------- | ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- | --------------------------- | --------------------------------------------------- |
| Subset reader (TypeScript)    | 9,422 B (28,390 B)         | 14.7 to 27.6 ms                          | 82 of 82 (79 before CS-913)                      | Nothing                                                 | This repository's           | Ours; no build                                      |
| LightUSD 1.0.0 (wasm, `next`) | 817,081 B (2,855,836 B)    | 42.2 to 70.1 ms; doesn't open the pallet | 67 of 82: all but 15 on the pallet               | `wasm-unsafe-eval`                                      | Apache 2.0                  | Light Transport; C++ and emscripten                 |
| OpenUSD 26.11.1 (wasm32)      | 1,718,550 B (10,122,668 B) | 138.2 to 153.2 ms                        | The reference                                    | Cross-origin isolation (COOP, COEP); `wasm-unsafe-eval` | TOST 1.0 (Apache 2.0 based) | Pixar and AOUSD; C++, oneTBB, emscripten, a harness |

None of them needs `unsafe-eval`. OpenUSD's time includes copying every layer into its in-memory file system, which the other two readers don't do (see Start time). The times are from run `2026-11-22T10-56-32-200Z-apple-metal-3`, on the Mac test machine (Apple M2), five runs each. The subset reader's size and coverage are from the rerun after CS-913, which ran on a busy machine (load 14 on 8 cores); its start times (15.6 to 27.5 ms for the subset reader) aren't comparable with the first run's quiet ones and aren't used.

## Size

What each reader ships for this job, measured from the files (gzip at level 9, Brotli at quality 11):

| Reader                                                  | Files                                      | Raw          | gzip        | Brotli      |
| ------------------------------------------------------- | ------------------------------------------ | ------------ | ----------- | ----------- |
| Subset reader (bundled, with its records adapter)       | `reader.js`                                | 27,633 B     | 10,133 B    | 9,152 B     |
| LightUSD 1.0.0, `next` module, built here (MinSizeRel)  | `lightusd_next.js`, `lightusd_next.wasm`   | 2,855,836 B  | 1,040,934 B | 817,081 B   |
| OpenUSD 26.11.1, wasm32, every library it builds, `-Oz` | `openusd_reader.js`, `openusd_reader.wasm` | 10,122,668 B | 2,719,747 B | 1,718,550 B |

- **LightUSD's 1.6 MB against 7.1 MB is settled: neither is the module a host ships today.** The 7,104,000 B file in the npm package is `lightusd.wasm`, the deprecated "legacy" module. The `next` module, which LightUSD's README tells new integrations to use, is 2,336,002 B in the npm package and 2,358,536 B built here with emsdk 7.0.0. The README's 1,671,646 B was measured on 2026-09-07 with Emscripten 4.0.14, before 1.0.0. Its JavaScript glue adds 497,300 B raw, 62,269 B with Brotli.
- **OpenUSD, built for size, is smaller than the builds others publish** (19.7 to 36.4 MB in CS-833's note), because `build_usd.py` leaves out MaterialX, UsdImaging and validation for wasm, and the harness links no imaging. It is still about 3.5 times LightUSD and 370 times the subset reader.
- The subset reader is 1,387 B larger than CS-833 measured (26,246 B), because this bundle includes the adapter that writes its records.

## Start time

From `new Worker` on the page to a composed stage in that worker: the sample's layers are already in memory, and the reader's module is fetched and compiled fresh each run (`no-store`). Median of five runs, with the first run beside it, in milliseconds:

| Sample                        | Subset, median (first) | LightUSD, median (first) | OpenUSD, median (first) |
| ----------------------------- | ---------------------- | ------------------------ | ----------------------- |
| `copper_brushed` (a material) | 17.2 (23.6)            | 56.1 (62.5)              | 148.0 (232.3)           |
| `alcohol_a01`                 | 18.1 (35.8)            | 64.5 (89.7)              | 139.7 (214.6)           |
| `apple_a01`                   | 17.7 (19.1)            | 61.9 (75.8)              | 145.3 (167.1)           |
| `industrialplasticpallet_a01` | 21.5 (23.3)            | doesn't open             | 145.0 (201.8)           |
| `obs_lamp_revolute_a01`       | 27.6 (27.7)            | 70.1 (75.1)              | 153.2 (169.5)           |
| `traffic_cone_chn_red`        | 14.7 (31.7)            | 42.2 (68.7)              | 138.2 (153.7)           |

Where the time goes, from each worker's own split (medians):

- **Loading the reader** (importing its module; for the WebAssembly ones, fetching, compiling and instantiating it): subset 1.5 ms, LightUSD about 18.5 ms, OpenUSD 34 to 41 ms, which includes starting its pool of four threads.
- **Composing:** subset 3 to 16 ms, growing with the sample; LightUSD 17 to 45 ms; OpenUSD 95 to 110 ms. OpenUSD's composition is nearly flat across samples, from one prim (the cone) to 55 (the lamp): most of it is its first `UsdStage::Open` in a fresh module, which sets up the plugin and schema registries. A long-lived worker would pay that once; a new worker pays it every time.
- **The rest,** about 10 ms for every reader, is creating the worker and loading its own module from the dev server, the same for all three.

- **OpenUSD's compose time includes a copy the others don't pay.** Before `UsdStage::Open`, the worker writes every layer of the sample into OpenUSD's in-memory file system (`FS.writeFile`), inside the span counted as composing. The subset reader and LightUSD read the layers' bytes directly. That copy was not timed apart in run `2026-11-22T10-56-32-200Z-apple-metal-3`, so its share of OpenUSD's 95 to 110 ms isn't known; read OpenUSD's compose and start numbers as an upper bound on its composition alone. The conclusion doesn't depend on it: OpenUSD's module load alone (34 to 41 ms) and its isolation requirement stay.
- **The first subset run on a cold Vite server also pays the worker's on-demand transform,** which raises its first-run figure (`firstMs`) but not its median. The subset reader's first runs (up to 35.8 ms against a 17 to 18 ms median) include that.

The first run is slower for every reader, by up to 85 ms for OpenUSD. The machine was quiet by Dyno's measure when the run started (load below 0.3 per core); five runs give medians, not intervals, so read differences of a few milliseconds as no difference.

## Coverage of CS-802 B's features

Each reader's composed stage becomes plain prim records (path, type, applied schemas, authored attributes as counts, sums and short values, relationship targets). One function (`facts.ts`) counts the same facts from every reader's records, and each fact is checked against OpenUSD's, the reference implementation. A check is one fact on one sample: 21 facts over six samples.

| Feature (its checks)                                                                                     | Subset reader | LightUSD | OpenUSD (reference) |
| -------------------------------------------------------------------------------------------------------- | ------------- | -------- | ------------------- |
| FET001: up axis, meters per unit, default prim, prims, meshes, triangles, meshes with normals and extent | 38 of 38      | 30 of 38 | 38 of 38            |
| FET006: materials, UsdPreviewSurface shaders, textures with a file, meshes with UVs                      | 15 of 15      | 13 of 15 | 15 of 15            |
| FET009: meshes bound to a material that exists                                                           | 4 of 4        | 3 of 4   | 4 of 4              |
| FET011: prims with `SemanticsLabelsAPI`, their labels, prims with Isaac's older `SemanticsAPI`           | 9 of 9        | 8 of 9   | 9 of 9              |
| UsdPhysics: rigid bodies, colliders, mass, joints, physics materials                                     | 16 of 16      | 13 of 16 | 16 of 16            |
| **All five**                                                                                             | 82 of 82      | 67 of 82 | 82 of 82            |

**These count only the non-empty checks:** those where OpenUSD's value isn't empty, zero or null. A reader that ignored a feature would still agree on a sample that has none of it (zero rigid bodies, no labels), so those checks can't tell readers apart. 44 of the 126 checks (21 facts over six samples) are of that kind. They are listed apart, as agreements out of the empty checks: the subset reader 44 of 44, LightUSD 38 of 44, OpenUSD 44 of 44. Per feature, empty checks only:

| Feature    | Empty checks | Subset reader | LightUSD |
| ---------- | ------------ | ------------- | -------- |
| FET001     | 10           | 10            | 10       |
| FET006     | 9            | 9             | 7        |
| FET009     | 2            | 2             | 2        |
| FET011     | 9            | 9             | 7        |
| UsdPhysics | 14           | 14            | 12       |

The subset reader's column is from the rerun after CS-913 (it was 37, 14, 4, 9 and 15 of the same totals before). The rest is recomputed under this rule from run `2026-11-22T10-56-32-200Z-apple-metal-3`'s saved per-check values, not from a new run. They were first counted over all 126 checks (123 for the subset reader and 105 for LightUSD, which the side-by-side table had misstated as 102 and 84 of 105); the empty checks made that look better than it is. The instrument now reports both counts, and "n/a" when OpenUSD opens no sample, so the reference's own row can't claim agreement it didn't earn.

**On five of the six samples, all three readers agree on every check.** Every disagreement is on one sample, the pallet (`industrialplasticpallet_a01`), the one whose layers reference two files outside its folder that the sample doesn't include (a thumbnail rig and a shared physics material). That is a broken asset, as NP.008 would report it, and it shows how each reader fails:

- **OpenUSD** reports both missing layers as composition errors and composes the rest, as USD specifies.
- **LightUSD refuses the whole stage.** Its flattening stops at `Unresolved reference prim path @../../../materials/physics/physics_plastic.usda@<defaultPrim>: layer has no defaultPrim and the arc names no prim path`. It has no way to be told a layer is missing; the harness gives it an empty layer, which is what stops it. So every one of the pallet's 21 checks fails for LightUSD, and those are all its misses.
- **The subset reader composed the pallet but got three facts wrong** (fixed by CS-913; the next section says how). It kept `/Tagging/ThumbRig`, which only the missing payload would define, so OpenUSD leaves it out as undefined (HI.010); the subset reader took the strongest specifier and didn't know whether any opinion defines the prim. And it dropped `…_inst/PhysicsMaterials` and `…/PhysicsMaterials/plastic` and the collider API on the mesh. CS-900 put that down to the failed reference. It was the variant selection: see below.

**What the samples don't test.** No sample uses relocates, value clips, time-offset layers, variant fallbacks or deep inherits, which the subset reader refuses or leaves out (CS-833's list). So the agreement above is on SimReady props as they are, not on USD in general. OpenUSD composes all of those; LightUSD claims LIVRPS composition, which these samples don't test past references, payloads, sublayers and variants.

**Isaac's older `SemanticsAPI` on the pallet.** OpenUSD's `GetAppliedSchemas()` leaves out schemas it has no definition for, so the harness reads the composed, authored `apiSchemas` list as well, as the other readers see the data. With that, all three agree that the pallet's two labeled prims use the older schema.

## What the host page must allow

Read from the files themselves (`host.ts`), and confirmed by running each in the harness:

| Reader        | Threads, so cross-origin isolation (COOP and COEP) | `wasm-unsafe-eval` | `unsafe-eval` |
| ------------- | -------------------------------------------------- | ------------------ | ------------- |
| Subset reader | No                                                 | No                 | No            |
| LightUSD      | No: its `next` module has no shared memory         | Yes                | No            |
| OpenUSD       | Yes: its module imports a shared memory            | Yes                | No            |

- **OpenUSD needs a cross-origin isolated page,** because `build_usd.py` links with `-pthread` and oneTBB has no single-threaded wasm build. A host that embeds the engine must then serve its own page with COOP `same-origin` and COEP `require-corp`, and every cross-origin resource on that page (tiles, imagery, fonts) must send CORP or CORS headers. That is a cost to the host, not only to the engine.
- **No glue builds code from strings** in these builds: neither `lightusd_next.js` nor `openusd_reader.js` has `new Function(` or `eval(`. CS-833's note read that their glue did; that holds for the legacy `lightusd.js` in the npm package (two `new Function(`), not for the modules measured here.
- In the harness, isolation is set by `serve.mjs` on its own routes only (the harness page, its worker and the readers' files). The shared Vite config and the owner's servers didn't change.

## Licenses, sources and upkeep

- **The subset reader.** License: this repository's. Source: `spikes/usd-subset/`. Build: none; TypeScript, bundled with the engine. Maintained by us: about 2,300 formatted lines, against a crate format the AOUSD Core Specification documents.
- **LightUSD 1.0.0.** License: Apache 2.0 (the npm package's metadata says "Apache-2.0 OR MIT"; its LICENSE file is Apache 2.0). Source: github.com/lighttransport/LightUSD, tag `v1.0.0`, commit a596dad9366a079892de8b003a7793188b34551a. Build: emscripten and CMake, as its `web/README.md` documents, with one forced include under emsdk 7.0.0. Maintained by Light Transport Entertainment; 1.0.0 is its first stable release (2026-11), and its `next` core is about 89,000 lines of C++.
- **OpenUSD 26.11.1.** License: Tomorrow Open Source Technology License 1.0 (Apache 2.0 with a different trademarks section). Source: github.com/PixarAnimationStudios/OpenUSD, tag `v26.11.1`, commit 96c1989167d2aaab5bd34627f32a321a6b79866b. Build: `build_usd.py --build-target wasm`, with oneTBB 2021.12.0 and zlib through emscripten's port, forced includes under emsdk 7.0.0, and a harness of our own with every library linked whole. Maintained by Pixar, with the Alliance for OpenUSD; `pxr/base` and `pxr/usd` are about 730,000 lines, and it builds for WebAssembly since 26.03.

**What the builds cost here.** Both C++ builds needed a fix for emsdk 7.0.0, whose C++ library no longer includes `<cmath>` and `<algorithm>` through other headers: LightUSD's `next` bindings and oneTBB rely on that. OpenUSD's first attempt failed on it in oneTBB, and the second passed with the headers force-included. The OpenUSD harness needed three things its documentation doesn't say: link every library whole (its CMake targets ask for it, but CMake reorders the flags away), set `PXR_PLUGINPATH_NAME` to `/usd/` before its static constructors run (its other plugin locations are relative to an executable a worker doesn't have), and create `/var/tmp` for its crash report. Each of these is upkeep a host would repeat for every release. The setup store's `~/.cesium-bench/usd-readers/SOURCES.md` records every URL, tag, commit and checksum.

**The samples' license.** The six samples are Apache 2.0 by the SimReady Foundation repository's `LICENSE.txt`, now kept beside them in the setup store with a `SOURCE.md`. Some of their layers' own metadata names "CC-BY 4.0" as `asset_license`. Both allow this use; the difference matters only if a sample is ever distributed, which nothing here does.

## How it was measured

- **The instrument:** one Lab harness, `usdReaders`, registered in `bench/suite/commands/lab.mjs` and listed in Dyno's instrument catalog as `usdReaders` (run kind `lab`, with its metrics: bytes raw, gzip and Brotli, start time, coverage). Lab runs aren't recorded in the results store until CS-401; until then a Lab run's results file name is its run id, which `dyno measure` now keeps in its completion record. That is the one change to Dyno's commands.
- **Tests:** `test/usdReaders.test.ts` checks the instrument's own logic in Node on fixtures (facts, coverage, both adapters, sizes, the page's requirements). It loads no sample and no build.
- **The outcome rule:** a run opened a sample only if it composed a stage and delivered its records; a run that composed and then failed is reported as that, not as "not opened". Timings count only runs that opened; records and coverage come from the first run that opened; a sample is opened (every run opened), mixed (some did) or failed (none did). The page and the results file say so, and `test/usdReaders.test.ts` tests the rule.
- **The page:** on its own dev server (`serve.mjs`, port 4102), Chrome's Edge channel headless through Playwright, the Mac test machine (Apple M2, 8 cores). Five runs per reader and sample, interleaved. Each run creates a new module worker; the reader's module is fetched with `no-store`, so each run fetches and compiles it as a first visit would.

## Rerun after CS-913 (2026-11-22)

CS-913 fixed the subset reader's composition faults on broken assets and tested them against OpenUSD. The reader still lives in `spikes/usd-subset/`; it is not a package module yet, and nothing moved. OpenUSD stays a comparison only (CS-901 A): the run read its builds from the setup store, as CS-900 did, and nothing of it is a dependency.

**What changed in the reader** (`spikes/usd-subset/compose.ts`):

- **A failed reference, payload or sublayer is reported by name, in OpenUSD's words, and contributes nothing.** OpenUSD records `PcpErrorInvalidAssetPath` (`Could not open asset @path@ for reference introduced by @layer@</prim path>.`, with "payload" for a payload) and `PcpErrorInvalidSublayerPath` (`Could not load sublayer @path@ of layer @layer@; skipping.`), then goes on composing: the prim keeps its own opinions and every other prim composes. The reader already kept those prims; what was missing was the report, now `Stage.errors`, shown as the records' `errors`. For the pallet, its two errors are the same text as OpenUSD's, with the same site paths.
- **A relative asset path is anchored on the layer that authored the arc,** as OpenUSD does, not on the prim's strongest layer.
- **A variant selection takes in the stronger sites a prim inherits from its parent's namespace.** This was the real cause of the pallet's dropped `PhysicsMaterials`, `plastic` and collider. `industrialplasticpallet_a01_base.usd` selects `PhysicsVariant=RigidBody` in an `over` of the `_inst` prim, and the referenced layer's own prim selects `None`. The reader expanded the sites one at a time and saw the referenced layer's `None` first. It never reached the failed reference at all: the variant that holds it wasn't selected.
- **A prim is on the stage only when a layer defines it and its parent is defined.** `def` and `class` beat any `over`, wherever it comes from, as in `usd/stage.cpp`; a prim with only `over` specs (the pallet's `/Tagging/ThumbRig`, whose `def` is in the missing payload) is left out with everything under it, as `UsdPrim::IsDefined` and the stage traversal do.

**Review fixes (2026-11-23).** USD files are untrusted input, and a review found the composer could recurse without end:

- **An arc cycle is reported and dropped, as OpenUSD does.** A prim whose reference, payload, inherit or specialize targets a site in the same layer stack whose path is an ancestor or descendant of one it composes under (`def "B" (references = </World>)` inside `/World`, say) used to overflow the stack. OpenUSD's `_CheckForCycle` (`pcp/primIndex.cpp`) drops that arc and records `PcpErrorArcCycle`. The reader now does the same, with its `ToString` text (`Cycle detected:` and the chain of sites), except that OpenUSD's root layer stack also names the stage's session layer. A namespace deeper than 256 prims stops composing there, a guard of the reader's own.
- **Errors are bounded.** The stage lists its first 100 errors and unresolved arcs, then counts the rest; a quoted path longer than 200 characters is cut, and control characters in it are replaced.
- **A relative path that climbs above the root is refused** and reported as the file wrote it, rather than clamped at the root.
- **References and payloads are anchored before their list ops compose** (`pcp/composeSite.cpp`), so the same relative path in two layers of a stack stays two arcs when it names two files. The USDA reader also reads a bare path in a reference or payload (`</World>`) as an internal arc; it read it as an asset path before.

These change nothing on the six samples: the reader's facts, prim lists and errors are the same before and after on each, so the rerun's figures stand.

**What OpenUSD documents.** Its published API pages say only that `PcpErrorInvalidAssetPath` is "Invalid asset paths used by references or payloads" (<https://openusd.org/release/api/class_pcp_error_invalid_asset_path.html>, read 2026-11-22), and its glossary says a prim whose contributing specs all say `over` isn't visited by `UsdPrim::GetChildren` or `UsdStage::Traverse` (<https://openusd.org/release/glossary.html>, read 2026-11-22). Neither gives the message text or says the rest of the stage composes. Those come from the v26.11.1 source in the setup store (`pcp/errors.cpp`, `pcp/primIndex.cpp`, where the failed arc is recorded and the loop `continue`s; `pcp/layerStack.cpp`; `usd/stage.cpp`; `usd/primData.cpp`), read 2026-11-22, and from OpenUSD's own run on the pallet, whose two messages the subset reader now matches character for character.

**The rerun.** Run `2026-11-22T18-30-18-194Z-apple-metal-3` (a Lab run, `dyno lab usdReaders --url` on a server of its own on port 4109, the same instrument and rule as CS-900's); its results file is kept in the setup store beside the first run's. Each verdict below is read from the file's own coverage fields. Non-empty checks agreeing with OpenUSD, by sample:

| Sample                        | Non-empty checks | Subset reader, before | Subset reader, now | LightUSD |
| ----------------------------- | ---------------- | --------------------- | ------------------ | -------- |
| `copper_brushed`              | 6                | 6                     | 6                  | 6        |
| `alcohol_a01`                 | 19               | 19                    | 19                 | 19       |
| `apple_a01`                   | 19               | 19                    | 19                 | 19       |
| `industrialplasticpallet_a01` | 15               | 12                    | 15                 | 0        |
| `obs_lamp_revolute_a01`       | 19               | 19                    | 19                 | 19       |
| `traffic_cone_chn_red`        | 4                | 4                     | 4                  | 4        |
| **All six**                   | 82               | 79                    | 82                 | 67       |

The empty checks: the subset reader 44 of 44 (as before), LightUSD 38 of 44. OpenUSD is the reference. The subset reader's prim list matches OpenUSD's on every sample (no extra and no missing prims).

**What this doesn't show.** The six samples are still SimReady props as they are. The tests in `test/usdSubsetComposition.test.ts` add fixtures in the shape of these faults, but relocates, value clips, time offsets and variant fallbacks stay refused or left out, and nothing here checks them against OpenUSD. The run was on a busy machine, so its start times are not used.

## Follow-ups

For the main session to file, with kind, project and needs:

1. **Done (CS-913), "The subset reader's composition faults on broken assets, tested against OpenUSD".** Undefined prims left out, a failed reference reported and its prim's local opinions kept, and the variant selection fixed. Fixtures from the pallet's shape.
2. **work, CS-191: "OpenUSD in WebAssembly as a test oracle for the USD source".** Run CS-559's fixtures and the SimReady samples through this instrument's OpenUSD harness in Dyno and fail on disagreement. Needs CS-901.
3. **work, the benchmark project: "Lab runs in the results store" is CS-401; this instrument's runs should move there with it.** No new item: a note on CS-401.
