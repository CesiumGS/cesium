# Engine profiles: the look, support and fidelity

**Status (2026-11-13):** design and plan, not started. Written for review in the main session.

**Spec:** CESIUM2_WEBGPU_PLAN.md §13.41, its research section "Swappable and hybrid renderers behind `Engine`, `World` and `View`", that section's decisions (owner, 2026-11-13), and "Architecture decisions from the 2026-11-13 discussion".

**Goal:** one system for device facts, support reports, quality and presets, which doesn't become fragile as renderers, browsers and devices are added.

## The idea in one paragraph

**The look is the app's; the fidelity is the engine's.** The app describes one look: which features its design uses, and how much each one matters. The engine reproduces that look as faithfully as the renderer and device allow. First it switches to cheaper versions of the same effect. It drops a feature only as a last resort, and every step or drop it takes is reported. Hardware- and browser-specific paths with no visible difference are chosen automatically and appear only in the support report and the inspector. There are no quality levels and no per-level feature tables. Each feature owns a short ladder of steps, rules are data, and one pure function resolves the look into effective settings. Every value can be traced back to the rule that set it.

## Decisions in force

From the renderer decisions (owner, 2026-11-13):

- Each view reports what it supports, in the scene's terms (`view.support`).
- An unmet request warns once and falls back as documented. A strict mode throws. Today's silent fallbacks become reported ones.
- `GpuDevice`, `Capabilities` and `LimitsTier` move to an advanced entry point, `@cesium/next/gpu`. The main API stays renderer-agnostic.
- Hardware- and browser-specific paths stay out of the API. They appear only in the support report and the inspector, and they are detected and used automatically.
- Content every renderer must draw: globe, terrain, imagery and meshes (3D Tiles, glTF). Optional, but declared in `view.support`: vectors and labels, points and splats, b-rep patches, advanced translucency.
- The threading mode is a host option (`thread: "auto" | "main" | "worker"`), chosen by a probe. The main-thread mode offers no synchronous read that the worker mode can't.
- A WebGL 2 renderer is part of the PoC. Another session is planning it.

From this design session (owner, 2026-11-13):

- **Framing:** the app owns the look and the engine owns fidelity, as above. App builders want one design that reads the same everywhere and drops the expensive extras on weak hardware. They don't want a quality dial.
- **Default fidelity is automatic.** Apps can pin it (`fidelity: "fixed"`).
- Low/medium/high presets, intent names and budget-first designs were weighed and set aside (see "Alternatives considered").

## 1. Prior art

The full notes, with every claim marked as read, inferred or from memory, are outside the repository in the session notes (`engine-profiles-prior-art.md`). This is the summary. Pages were read on 2026-11-13 unless a date is given.

### How each system decides, and what went wrong

| System | What scales, and who decides | What became fragile |
| --- | --- | --- |
| Unreal: feature levels, shader platforms, scalability groups, device profiles | Ordered feature levels (`ES3_1`, `SM5`, `SM6`) gate features. Scalability groups (`sg.ShadowQuality` and others) map levels 0–3 (Low to Epic) to bundles of `r.*` console variables. A synthetic benchmark picks the level. Device profiles match GPU names by rules | ES2 was removed in 4.25 (2020), stranding devices. Lumen on SM5 stopped working in 5.5 with no release note (forum, 2024-11-16 to 2025-03-19). The benchmark index fell 20–35% between 5.4 and 5.5 on the same hardware, breaking a studio's thresholds (UE-290402, forum 2025-05-14). Intel (2026-03-09) says the default thresholds put new integrated GPUs in High or Epic. Android profiles match GPU families by regex, so a new GPU silently gets a default profile. Console variables are untyped strings, and some values do nothing |
| Unity: quality levels, render pipeline assets, graphics tiers, keywords | Named quality levels, each pointing at its own URP asset. Graphics tiers are probed at startup. `SystemInfo.supports*` flags | Settings moved from Quality Settings into pipeline assets, leaving two places for one setting. Tiers still run in URP and HDRP, but "the value of this field has no effect" (Unity 6.6 manual). Exceeding the 256-keyword limit made materials render black, with only a log line (forum, 2020-01-04). URP builds enumerated about 400 million variants (Unity blog, 2022-12-28), and one quality-level difference can double the variants. `supportsComputeShaders` was true where compute silently produced nothing |
| Filament: `FeatureLevel` 0–3 | Ordered levels from ES 2.0 to ES 3.1 plus texture units. `getSupportedFeatureLevel()`. The level can be raised but never lowered | The level APIs arrived in v1.26.0 (2022-08-31), and ES 2.0 was added underneath later (v1.36.0 to v1.46.0, 2023-11-15). That took several material-format bumps and a build flag, and an engine at level 0 can never change level. Its WebGPU backend reported ASTC and ETC2 when the device feature wasn't enabled (issue #10537, 2026-10-07) |
| bgfx: `Caps` | A flat bit field plus per-format caps. Caps describe; they don't gate | `IMAGE_RW` was always set on WebGPU, so bind group layouts failed, and the same cap meant something different on Metal (issue #4134, 2026-11-08). Caps under-reported RG32 writes (issue #4150, 2026-11-13). Detection broke when Metal's family enums changed (issue #3067, 2023-03-23) |
| wgpu: `Features`, `Limits`, `DownlevelCapabilities` | Three axes. Downlevel flags list how a backend falls short of WebGPU | Downlevel flags are a non-standard axis that can't be required or enforced (issue #7944, 2025-07-14). They now have to be mapped onto WebGPU's compatibility mode, which wgpu hasn't implemented (issue #8124, 2025-08-20). Flags are reported but not enabled (issue #10563, 2026-10-08). Format tables are wrong, "Metal is especially bad" (issue #8670, 2025-12-05). `Features` was split in v25.0.0 (2025-04-10), and names keep churning |
| USD Hydra render delegates | The renderer is swapped over one scene. Support is stated in scene terms: prim types, render-setting descriptors, AOVs, and `GetCapabilities()` (added in 24.03, 2024-02-23) | Settings are untyped token and value pairs. `SetRenderSetting` accepts any key, and the typed getter returns the default on a type mismatch, so a wrong key or type is ignored silently. Descriptors carry no type or range. `GetCapabilities()` still reports only `motionBlur`. The `IsSupported` signature changed three times (23.02, 25.x, 26.08), and Storm's check tested a freshly built default GPU instead of the real one until 25.x |
| three.js `WebGPURenderer` | WebGPU, falling back automatically to the WebGL 2 backend (`forceWebGL`, r161, 2024-01-20) | The fallback discards the WebGPU error and logs a generic warning. `hasFeature('float32-filterable')` was always false on WebGL 2, because one vocabulary was mapped onto another by hand (issue #35364, 2026-11-05). Compute writes give different answers on the fallback (issue #31250, 2025-06-10). A "Force WebGL" toggle saved in localStorage kept a maintainer on WebGL for weeks, and CI marked skipped WebGPU tests as passed (issue #33559, 2026-05-11) |
| Godot 4 | Three renderers (Forward+, Mobile, Compatibility). Since 4.4 (PR #97142, merged 2024-09-20) it falls back to Compatibility automatically | The docs say only that the project "may look different". In the debate (proposal #8006, 2023-10-06 to 2024-09-20), developers warned that a silent fallback breaks content that depends on missing features |
| Babylon.js | `engine.getCaps()`: a WebGL-shaped struct with WebGPU facts bolted on as optional fields. An opt-in `SceneOptimizer` steps down through optimizations by priority until a target frame rate is reached (docs, undated) | A device quirk became a permanent cap (`canUseGLInstanceID`). Users report the optimizer changing the look, for example dimming a glow layer (forum, undated) |
| ArcGIS Maps SDK for JavaScript: `SceneView.qualityProfile` | `"low" \| "medium" \| "high"`, set automatically from the detected browser: `low` on iPhones, `medium` elsewhere. Esri recommends not setting it, and suggests apps let users change it (`@arcgis/core` 5.0.19, 2026-04-29, `SceneView.d.ts`) | One ladder mixes memory limits, level of detail, feature counts and visual effects. Under memory pressure the view reduces detail and "some features may not be visible", so appearance and content are traded together |
| model-viewer | Lowers the render scale automatically to hold the frame rate, and reports it through a `render-scale` event (`reportedDpr`, `renderedDpr`, `minimumDpr`, and a `reason` in 4.x) | Only resolution scales. Scaling went back to full resolution only after a fix, once the model stopped moving (changelog, undated) |

Sources:

- Unreal: [scalability reference](https://dev.epicgames.com/documentation/en-us/unreal-engine/scalability-reference-for-unreal-engine) (5.9, undated); [device profiles](https://dev.epicgames.com/documentation/en-us/unreal-engine/setting-up-device-profiles-in-unreal-engine) (5.9, undated); [Android configuration rules](https://dev.epicgames.com/documentation/unreal-engine/using-the-android-configuration-rules-system-in-unreal-engine) (5.9, undated); [mobile rendering in 4.24 and 4.25](https://www.unrealengine.com/tech-blog/updates-to-mobile-rendering-support-in-unreal-engine-4-24-and-4-25) (2020-01-23; read through search summaries, direct fetch refused); [synthbench values in 5.5](https://forums.unrealengine.com/t/gpu-benchmark-synthbenchmark-gives-different-gpuperfindex-values-in-5-5/2577452) (2025-05-14 to 2025-05-27; [UE-290402](https://issues.unrealengine.com/issue/UE-290402)); [Intel's Unreal optimization guide, chapter 2](https://www.intel.com/content/www/us/en/developer/articles/technical/unreal-engine-optimization-chapter-2.html) (2026-03-09); [Lumen on DX11 and SM5 in 5.5](https://forums.unrealengine.com/t/lumen-no-longer-working-in-ue5-5-dx11-sm5/2126402) (2024-11-16 to 2025-03-19).
- Unity: [graphics tiers](https://docs.unity.com/en-us/engine/current/manual/render-pipelines/built-in-render-pipeline/built-in-graphics-quality-settings/graphics-tiers) (6.6, undated); [keyword limit and black materials](https://discussions.unity.com/t/maximum-number-256-of-shader-global-keywords-exceeded-keyword-will-be-ignored-and-black-materials/771223) (2020-01-04 to 2022-04-16); [2021 LTS shader build times](https://unity.com/blog/engine-platform/2021-lts-improvements-to-shader-build-times-and-memory-usage) (2022-12-28).
- Filament: [`DriverEnums.h`](https://raw.githubusercontent.com/google/filament/main/filament/backend/include/backend/DriverEnums.h) and [`Engine.h`](https://raw.githubusercontent.com/google/filament/main/filament/include/filament/Engine.h) (main); [release notes](https://github.com/google/filament/blob/main/RELEASE_NOTES.md); [issue #10537](https://github.com/google/filament/issues/10537) (2026-10-07).
- bgfx: [API docs](https://bkaradzic.github.io/bgfx/bgfx.html) (undated); issues [#4134](https://github.com/bkaradzic/bgfx/issues/4134) (2026-11-08), [#4150](https://github.com/bkaradzic/bgfx/issues/4150) (2026-11-13), [#3067](https://github.com/bkaradzic/bgfx/issues/3067) (2023-03-23).
- wgpu: [changelog](https://github.com/gfx-rs/wgpu/blob/trunk/CHANGELOG.md); issues [#7944](https://github.com/gfx-rs/wgpu/issues/7944) (2025-07-14), [#8124](https://github.com/gfx-rs/wgpu/issues/8124) (2025-08-20), [#10563](https://github.com/gfx-rs/wgpu/issues/10563) (2026-10-08), [#8670](https://github.com/gfx-rs/wgpu/issues/8670) (2025-12-05).
- Hydra: [`renderDelegate.h`](https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/release/pxr/imaging/hd/renderDelegate.h) and [`renderDelegate.cpp`](https://raw.githubusercontent.com/PixarAnimationStudios/OpenUSD/release/pxr/imaging/hd/renderDelegate.cpp) (release branch); [OpenUSD changelog](https://github.com/PixarAnimationStudios/OpenUSD/blob/release/CHANGELOG.md) (23.02, 2023-01-24, to 26.08, 2026-07-20).
- three.js: [`WebGPURenderer.js`](https://github.com/mrdoob/three.js/blob/dev/src/renderers/webgpu/WebGPURenderer.js) (r188dev); [PR #27596](https://github.com/mrdoob/three.js/pull/27596) (2024-01-20); issues [#35364](https://github.com/mrdoob/three.js/issues/35364) (2026-11-05), [#31250](https://github.com/mrdoob/three.js/issues/31250) (2025-06-10), [#33559](https://github.com/mrdoob/three.js/issues/33559) (2026-05-11).
- Godot: [renderers](https://docs.godotengine.org/en/stable/tutorials/rendering/renderers.html) (4.7 docs); [proposal #8006](https://github.com/godotengine/godot-proposals/issues/8006) (2023-10-06 to 2024-09-20); [PR #97142](https://github.com/godotengine/godot/pull/97142) (merged 2024-09-20).
- Babylon.js: [`engineCapabilities.ts`](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Engines/engineCapabilities.ts) (master); [Scene Optimizer](https://doc.babylonjs.com/features/featuresDeepDive/scene/sceneOptimizer) (undated); [optimizer dimming a glow layer](https://forum.babylonjs.com/t/i-am-using-scene-optimizer-for-performance-improvement-but-it-reduces-the-glow-layer-intensity-from-the-scene/52101) (undated).
- ArcGIS: [`SceneView.d.ts` in `@arcgis/core` 5.0.19](https://unpkg.com/@arcgis/core@5.0.19/views/SceneView.d.ts) (published 2026-04-29); [SceneView memory sample](https://developers.arcgis.com/javascript/latest/sample-code/sceneview-memory) (undated).
- model-viewer: [loading examples, render scale](https://modelviewer.dev/examples/loading/) (undated); [`Renderer.ts` in 4.2.0](https://cdn.jsdelivr.net/npm/@google/model-viewer@4.2.0/src/three-components/Renderer.ts).

CesiumJS 1.x has explicit flags (`scene.msaaSamples`, `resolutionScale`, `shadows`, `fxaa`, `highDynamicRange`) and chooses little for the app. That's from memory and wasn't checked in this session. It's what 1.x developers will expect.

### Lessons taken

1. **Silent fallback is the most common failure** (Unity's black materials, Lumen on SM5, three.js's generic warning, Godot's "may look different"). Every fallback here leaves a structured record: what was asked, what was given, and why.
2. **Ordered levels decay.** Bottom levels are removed (Unreal) or added late at high cost (Filament), and a level's name keeps its meaning while features leave it. **Flat flags grow without bound and drift between backends** (bgfx, wgpu, Babylon). So the engine's own vocabulary is per feature, and device facts stay close to the standard (WebGPU features and limits as named by the spec).
3. **Benchmarks drift, and string rules fail silently on new hardware.** No startup benchmark. Vendor rules are allowed only as provenance-tagged cost rules, and unknown hardware falls through to the best supported step, with the inspector saying "no rule matched".
4. **Caps lie both ways.** Read what the device enabled (`device.features`), never the adapter's list or "the format exists". Detection is a pure function of a recorded fact set, so it can be replayed in tests.
5. **Untyped settings accept values and ignore them** (Unreal console variables, Hydra tokens). Settings are typed, validated when set, and report "not applied because …".
6. **Per-level differences in compiled code multiply shader variants** (Unity). Steps should be runtime parameters (resolution, sample counts, cascade counts) wherever they can. Compile-time steps are counted against a budget.
7. **Tests must fail when the intended path didn't run** (three.js CI). **Hidden persisted switches mislead** (three.js's localStorage toggle). Emulation here is visible in the inspector and never persists by itself.
8. **One ladder that mixes content with appearance hides trade-offs** (ArcGIS). Here appearance and accuracy are separate classes (section 3).

### Alternatives considered

| Approach | Why it was set aside |
| --- | --- |
| Low/medium/high presets with per-feature overrides (Unreal, Unity, ArcGIS) | A preset × feature table to maintain and test. Presets scale features, not looks, so the same app looks different by machine in ways nobody designed. Thresholds drift |
| Intent names (`explore`, `present`, `analyze`, `capture`) | Useful words, but they mix what a view is for with how good it is. What survives: `fidelity: "fixed"` for tests and captures, and the accuracy class |
| A cost budget and solver as the main knob (Unity Adaptive Performance, Babylon's optimizer) | It needs measured costs this engine doesn't have yet, and the image varies from run to run. It is kept as a later, opt-in way to pick steps (section 8, "Later") |
| A CSS-like cascade as the public model | Kept as the internal mechanism (layers, rules as data, an explain trail), not as the headline |

## 2. Layers and the direction of derivation

```text
facts ──▶ support ──┐
                    ├──▶ resolve ──▶ effective ──▶ renderer, inspector, notices
look + fidelity ────┘       ▲
                 rules ─────┘   (data: support rules, cost rules, limits)
```

Derivation runs one way only. Render code reads **effective settings and paths**. It never reads facts. A seam test enforces this (section 5).

| Layer | What it is | Who writes it | Visibility |
| --- | --- | --- | --- |
| **Facts** (`DeviceFacts`) | Everything observed: the renderer (`webgpu`, later `webgl2`), the device's enabled features and limits, the limits tier, adapter info (vendor, architecture, `isFallbackAdapter`), the thread mode and the reason for it, `crossOriginIsolated`, probe results (sample-rate probe, the thread probe), canvas format, devicePixelRatio. Facts are per renderer: WebGL 2 facts use WebGL's names and are never mapped onto WebGPU names | The engine, once per device, and again after device loss | Advanced (`@cesium/next/gpu`), the inspector |
| **Paths** | Implementation choices made from facts that make no visible difference: star submission direct or indirect, the KTX2 transcode target, the MSAA storage-write path, subgroups, `shader-f16`. A path may change performance but not the image (within the parity tolerance) | `paths(facts)`, one function | Listed in `support.paths` as diagnostic strings, whose names are documented as unstable. The inspector |
| **Support** (`SupportReport`) | What this view can do, in scene terms: content kinds, the steps each feature offers here, outputs (AOVs), queries and their backends, the update model (each tick or progressive), and the paths | `support(facts, renderer)`, a pure function | **Public:** `view.support` |
| **The look** | The view and engine options the app sets (`shadows`, `ambientOcclusion`, glare, translucency …), each `false`, `true` (the engine picks the step) or a named step (pinned), plus per-feature importance overrides | The app | **Public:** the existing options, extended |
| **Fidelity** | `"auto"` (default): the engine picks steps for features left at `true`, by cost rules. `"fixed"`: always the best supported step. `strict`, separately, turns every warning into a thrown error | The app | **Public:** `EngineOptions.fidelity`, `ViewOptions.fidelity`, `EngineOptions.strict` |
| **Rules** | Data. Support rules say which steps need which facts. Cost rules cap a step from facts and context (pixel count, view size). Limits are hard caps from resources (binding sizes, memory). Each rule has an id, a reason sentence and provenance (measured on which devices, or estimated) | Engine authors, in `src/profile/rules.ts` | Internal. Each rule's id and reason show in explain trails and the inspector |
| **Effective** (`EffectiveSettings`) | Per feature: what was asked, the step given, its importance, and the trail of rules that decided it. Plus the active notices | `resolve(...)`, a pure function, rerun when its inputs change (options, resize, device loss) | **Public:** `view.effective`, `view.explain(feature)`. The inspector |

**Scope.** Some features are per engine (the texture transcode target, the moments format, World capacities, MSAA). Most are per view (shadows, ambient occlusion, glare, translucency method, FXAA, aerial perspective, sun disk, city lights, LOD transitions). The catalog marks each one's scope. Engine-scoped features appear in every view's effective settings, marked as engine-wide.

**Where it lives.** `src/profile/`: `facts.ts`, `catalog.ts` (features and ladders), `rules.ts`, `resolve.ts`, `support.ts`, `paths.ts`, `personas.ts`. It has no GPU imports beyond types, so it runs in Node tests and on either thread.

### The feature catalog

One entry per feature, all of it data:

```ts
interface FeatureEntry<Step extends string> {
  name: FeatureName;                 // "glare", "shadows", "ambientOcclusion", ...
  scope: "engine" | "view";
  steps: readonly Step[];            // best first; "off" is implicit and last
  defaultLook: boolean | Step;       // the engine's one default (Viewer stops overriding)
  importance: Importance;            // default: "essential" | "preferred" | "extra"
  class: "appearance" | "accuracy";  // accuracy features never step for cost
  stepKind: Record<Step, "runtime" | "compile">; // compile steps count against the variant budget
  requires: Partial<Record<Step, FactPredicate>>; // support rules
  fallback: Step | "off";            // documented fallback when nothing is supported
  doc: string;                       // what the feature promises, in one sentence
}
```

First entries (lead's proposal; ladders to confirm per feature during M2):

| Feature | Steps, best first | Importance | Notes |
| --- | --- | --- | --- |
| `glare` | `full`, `reduced`, `sources` | extra | Today's `GlareTier`. Its rules are today's `glareTier()` |
| `shadows` | `full` (4 cascades, 2048 px) | preferred | Later cheaper steps: 2 cascades or 1024 px. Today it's fixed |
| `ambientOcclusion` | `full` | extra | The 4096² pixel cap becomes a limit rule |
| `translucency` | `exact`, `moments32`, `moments16` | preferred | `moments16` is today's quiet fallback without `float32-blendable` (bias 6 × 10⁻⁴ instead of 5 × 10⁻⁶) |
| `fxaa` | `on` | extra | |
| `aerialPerspective`, `sunDisk`, `cityLights` | `on` | preferred | No steps today |
| `lodTransitions` | `morph`, `pop` | preferred | |
| `textureTranscode` (engine) | not a feature: a path | – | BC7, ASTC, ETC2, RGBA8 |
| `worldCapacity` (engine) | not a feature: a limit | – | Clamps become limit notices |

## 3. Detection versus declaration

**The engine may choose for the app** when all three hold:

- the choice is a **path** (no visible difference), or a step of an **appearance** feature the app left at `true` with `fidelity: "auto"`, or a **hard limit** forces it;
- the choice is a pure function of recorded facts and context, not of a timing taken at startup;
- the choice shows in `view.effective` with its rule and reason.

**The engine must ask** (it needs a declaration) when:

- **The choice changes accuracy:** positions, heights, picks, measured values, what content is loaded. Accuracy-class features never step for cost. When a hard limit forces an accuracy change (today: the screen-space error raised when the tile cache is over budget, caster error scale), that's allowed, but it is reported with its effect on accuracy, and query results carry it as they carry other uncertainty.
- **It depends on intent:** importance, `fixed` for tests and captures, `strict`.
- **It depends on what the engine can't observe reliably:** battery, thermal state, the user's preference. The host may pass such things in as context facts later. The engine doesn't guess them.
- **A pinned step can't run:** warn once and fall back as documented, or throw under `strict`.

**Probes** are allowed when they are cheap, deterministic, run once, and their result is recorded as a fact: the sample-rate probe and the thread probe today. A probe that errors records "unknown" and takes the safe path. That too is a reported fact, unlike today's sample-rate probe, which quietly assumes per-sample.

**Benchmarks** are not run at startup (Unreal's drift, first-run effects, shared GPUs). Per-step costs are measured from real ticks through `GpuTimer` where timestamps exist, and recorded for tuning the cost rules and for a later governor.

**Vendor and architecture rules** are cost rules with provenance. Glare's rules say "measured on M2; Intel and the rest estimated". The inspector marks estimated rules. Unknown hardware matches no rule and gets the best supported step, never a guessed lower bucket.

## 4. Fallback rules

**One rule, applied everywhere.**

| What happened | Record | Console | Under `strict` |
| --- | --- | --- | --- |
| A path chosen | `support.paths` | – | – |
| A cheaper step of a feature left at `true` (`auto`) | notice `stepped` | – | – |
| An `extra` feature dropped for cost (`auto`) | notice `dropped` | – | – |
| A pinned step can't run; lower step given | notice `unmet` | warn once | throws |
| A feature unsupported here (any importance); documented fallback given | notice `unsupported` | warn once for `preferred` and `essential` | throws for `preferred` and `essential` |
| A hard limit forced a change (resources) | notice `limited`, with its effect on accuracy for accuracy-class features | warn once | throws |
| An option the catalog doesn't know, or a value outside its type | – | – | always throws (validation) |

- "Warn once" means once per (view, feature, notice kind, given step), through one `warnOnce` helper.
- Notices go to a new `support` kind in the existing `Engine.errors` channel (kinds today: shader, pipeline, resource, frame, device, camera) and to the inspector's Problems section. A host can turn the console off (`warnings: false`). The records stay.
- `preferred` and `essential` features are never dropped for cost. The difference between them: an `essential` feature that is unsupported always warns, even when the app didn't set it explicitly.

### Today's silent fallbacks and what each becomes

From a read-only survey of `packages/next` at `c45a3751bb`:

| Where | Today | Becomes |
| --- | --- | --- |
| `src/atmosphere/starCells.ts:371` | No `indirect-first-instance`: stars drawn directly, silently | Path `starSubmission: direct` |
| `src/scene/RenderContext.ts:937`, :2592 | No `float32-blendable`: moments in rgba16float, silently | `translucency` step `moments16`, notice `unsupported` for `moments32` (preferred, so warn once) |
| `src/io/decoders.ts:150-161` | KTX2 to BC7, else ASTC, else ETC2, else RGBA8, silently | Path `textureTranscode`. RGBA8 adds a memory note in the inspector |
| `src/gpu/GpuTimer.ts:190` | No `timestamp-query`: `gpuMs` is NaN | Fact; the inspector says "GPU timing unavailable" instead of NaN |
| `src/gpu/sampleRateProbe.ts`, `RenderContext.ts:721` | Probe picks `fsListSamples` or `fsList`; on error, assumes per-sample, silently | Fact (`sampleRate: "per-sample" \| "per-pixel" \| "unknown"`) and a path |
| `src/render/post/glare.ts:184-191` | `"auto"`: vendor and pixel rule; the reason shows in `readout()` only | `glare: true` resolved by cost rules; notice `stepped`; `readout().glare` becomes a view onto `effective` |
| `src/render/view/shadowBlocks.ts:227` | Ambient occlusion skipped above 4096 × 4096 pixels, silently | Limit rule `ambientOcclusion.maxPixels`; notice `limited` (or a cost rule if it turns out to be cost, not a resource limit; check in M4) |
| `src/globe/SlicePool.ts:196-201` | Imagery slice ceiling from `maxTextureArrayLayers`; tooltip only | Limit notice; a support-report entry for imagery capacity |
| `SlicePool.ts:394-400` | Out of memory while growing: shares scaled down; `usage().warning` | Limit notice (accuracy class: imagery resolution), joining the same channel |
| `src/scene/World.ts:333-360` | `maxDraws`, `maxTransforms`, `maxMaterials`, `maxInstances` clamped silently | Limit notice when a requested capacity is clamped |
| `src/render/view/translucency.ts:56-89` | Exact list capacity clamped; layers dropped for one tick | Limit notice when layers are dropped; the regrowth is a refinement source (refinement plan) |
| `src/streaming/Stepwise.ts:276-288` | Screen-space error raised over budget; inspector `sse.adjusted` | Limit notice, accuracy class |
| `src/streaming/Budgeted.ts:486`, `tilesetUpdate.ts:449` | Caster error scale raised; `tileset.stats` only | Limit notice, accuracy class (shadows) |
| `src/scene/Engine.ts:1437-1442` | Upload budget halved after late ticks | Stays automatic: a scheduling choice, not a look. Shown in the inspector's scheduler row |
| `src/transform/compile.ts:367` | `"auto"` normals: linear on a costly route | Step of an accuracy-class feature `normals` (`exact`, `linear`), reported. It changes shading only, so it is allowed under `auto`, with the route's normal error stated |
| `src/streaming/Budgeted.ts:168,890` | `mixedLod: "auto"` | Stays a streaming policy; shown in the inspector. Not part of the look |

Device facts that need fixing on the way (M1):

- `Capabilities` reports 6 of 12 features.
- `float32-filterable`, `clip-distances`, `dual-source-blending` and `core-features-and-limits` are requested with no field. `subgroups` and `shaderF16` are never read.
- The inspector reads `adapter.info` itself and never sees `isFallbackAdapter`.
- On device loss, `caps` is recomputed, but the render context keeps the formats it chose at the start. This is unconfirmed: check it, and if it holds, re-resolve after loss.

## 5. Avoiding fragility

- **No profiles to multiply.** There's no preset × feature table. Each feature has a short ladder, so the data grows linearly with the number of features.
- **Profiles as data, not code branches.**
  - The catalog, the rules and the personas are data: typed literals with no functions.
  - Predicates are a tiny typed language over facts and context (`equals`, `in`, `above`, `below`, `all`, `any`), so rules can be listed, checked for reachability, shown in the inspector and serialized.
  - One pure resolver.
  - A seam test (`test/seams.test.ts` pattern) fails naming the line when anything outside `src/profile/` and `src/gpu/` reads `device.features`, `adapter.info`, `capabilities.` or `limits.` to choose behaviour. Render code reads `effective` and `paths`.
- **Typed settings.** The catalog generates the option types. Unknown keys and out-of-range values throw at the API boundary. The Hydra failure (accepted, then ignored) can't happen.
- **Personas: a matrix of synthetic devices.**
  - `src/profile/personas.ts` holds named fact sets: `m2-chrome`, `intel-uhd-4k`, `swiftshader` (fallback adapter), `minimum-limits`, `no-optional-features`, `no-float32-blendable`, `webgl2-basic` (with the WebGL 2 plan), and `worker` variants.
  - `test/fakeGpu.ts` grows the means to fake them: a features set, adapter info including `isFallbackAdapter`, and a `requestDevice` that honours `requiredFeatures`. Today it can't.
- **Invariant tests over personas × looks × fidelity:**
  1. every feature resolves on every persona, with no exception and a documented fallback;
  2. every renderer persona supports the required content kinds (globe, terrain, imagery, meshes);
  3. the step given is never better than the step asked;
  4. under `fixed` no `stepped` or `dropped` notice appears;
  5. every rule fires on at least one persona (no dead rules), and no rule is always shadowed by another;
  6. accuracy-class features never step except by a limit rule;
  7. `SupportReport`, `EffectiveSettings` and notices survive `structuredClone` (worker mode);
  8. compile-time steps stay within a variant budget (`test/styleCost.test.ts` pattern);
  9. snapshots of support and effective settings per persona, reviewed when they change.
- **Emulation keeps degraded paths in daily use.**
  - `Engine.create({ emulate: "intel-uhd-4k" })` clamps the real facts toward a persona. It can only remove capabilities, never add them.
  - It is exported from `@cesium/next/gpu`, is visible in the inspector header ("emulating intel-uhd-4k") and is never persisted by the engine. Dyno takes `?persona=`.
  - Developers then see their look on weak hardware before shipping, and fallback paths get exercised outside CI.
  - What it can't emulate (a real slow GPU's timings) is stated.
- **Tests fail when the intended path didn't run.** Parity pages assert the renderer and paths they expect from `view.support`, under `strict`.

### How the WebGL 2 renderer slots in

- The WebGL 2 renderer supplies its own facts (WebGL 2 limits and extensions, under their own names) and its own support rules: which content kinds and which steps per feature it offers.
- Its support report has the same shape. Features it lacks fall back per the catalog, under the same notice rule. The required-content invariant covers it from its first persona.
- Renderer choice is an engine option (`renderer: "auto" | "webgpu" | "webgl2"`, chosen by the same probe as the thread mode). Each view's report names its renderer, so mixing renderers per view (a path tracer) needs no API change.
- **To agree with the WebGL 2 planning session:** its persona, its fact schema, and the steps it offers.

### How the worker mode slots in

- Facts are gathered and `resolve` runs on the engine's thread.
- `SupportReport`, `EffectiveSettings` and notices cross to the main thread in the per-tick snapshot as plain data. `view.support`, `view.effective` and `view.explain()` read the snapshot, so they are the same in both modes.
- `strict` validation of a pinned step runs on the main thread against the snapshot's support report, so it can throw synchronously in both modes. Cost-rule outcomes never throw.
- The thread mode and the reason for it are facts.

## 6. API sketch

```ts
// Main entry: renderer-agnostic.
const engine = await Engine.create({
  canvas,
  fidelity: "auto",          // default; "fixed" pins every `true` feature to its best supported step
  strict: false,             // true: every warning throws
  warnings: true,            // false: no console output; notices are still recorded
  thread: "auto",
  renderer: "auto",
});

const view = engine.createView({
  shadows: true,             // the engine picks the step
  glare: "reduced",          // pinned: lowered only if unsupported, with a warning
  ambientOcclusion: false,
  importance: { shadows: "essential" }, // overrides the catalog's default
});

view.support;              // SupportReport: content kinds, steps per feature, outputs, queries, updates, paths
view.effective;            // EffectiveSettings: per feature { asked, given, importance, scope, because }
view.explain("glare");     // { asked: "reduced", given: "reduced", trail: [rule ids and reasons, winners and losers] }
engine.errors.on("support", (notice) => { /* { kind, view, feature, asked, given, rule, reason } */ });
```

```ts
// Advanced entry: hosts that share a device, tools and tests.
import { GpuDevice, DeviceFacts, LimitsTier, BASE_BINDING_LIMITS, personas } from "@cesium/next/gpu";
const engine = await Engine.create({ canvas, emulate: "webgl2-basic" });
engine.facts;              // DeviceFacts (advanced only)
```

Types:

```ts
type Importance = "essential" | "preferred" | "extra";
interface Reason { rule: string; layer: "catalog" | "support" | "cost" | "limit" | "engine" | "view"; text: string; provenance?: string }
interface EffectiveFeature { asked: Step | boolean; given: Step | "off"; importance: Importance; scope: "engine" | "view"; because: readonly Reason[] }
interface Notice { kind: "stepped" | "dropped" | "unmet" | "unsupported" | "limited"; view?: ViewId; feature: FeatureName; asked: string; given: string; rule: string; reason: string; accuracy?: string }
```

**Inspector.** A Profile section, under the inspector rules (values change, layout doesn't):

- **Header:** renderer, thread mode, fidelity, and the persona when emulating.
- **Facts:** adapter, `isFallbackAdapter`, limits tier, features as fixed-slot rows, probe results.
- **Paths.**
- **Features:** a fixed-slot table with columns feature, importance, asked, given and why. The why column holds a rule id, with the reason and provenance behind an ⓘ. Estimated rules are marked.
- **Notices** join Problems.

The snapshot comes from public reads (`view.support`, `view.effective`) plus `engine.facts` from the advanced entry.

## 7. Migration

**Glare:**

- `GlareTier` becomes the `glare` ladder. `tier: "auto"` becomes `glare: true`, and a named tier becomes a pinned step.
- `glareTier()`'s three branches become cost rules (`glare.fallbackAdapter`, `glare.intel.pixels`, `glare.default.pixels`) with provenance "measured on M2; others estimated". `glareReason()` becomes the rules' reason text.
- `View.glareResolved` and `readout().glare` read from `effective`. The observer settings shape (`eyeGlare`, `cameraGlare`) stays public and maps onto the feature.
- Glare stays off by default (`glare: null` today), as an `extra` feature.

**Viewer defaults:**

- One table of defaults: the catalog's `defaultLook`. The Viewer stops overriding shadows and ambient occlusion.
- The lead's proposal (question 1 below): the engine's defaults turn shadows on (`preferred`) and ambient occlusion on (`extra`), because automatic fidelity now handles weak devices. Parity tests set their looks explicitly under `fixed`.
- The Viewer's `eyeObserver()` stays. It's what the widget is for, not a quality setting.
- The Viewer's smaller World capacities (65,536 draws against 262,144; 768 MiB of vertex bytes against 1 GiB) become one default derived from device limits, with clamps reported (question 6).

**Public API:**

- `Capabilities` gives way to `DeviceFacts` in `@cesium/next/gpu`, with `GpuDevice`, `LimitsTier` and `BASE_*_LIMITS`.
- `Engine.capabilities` moves to `engine.facts` on the advanced entry.
- `npm run surface` is rerun and `test/importBoundary.test.ts` is extended for the new entry point.

## 8. Milestones

Sized for one agent each. Use Sonnet unless marked Opus. Each milestone runs typecheck, eslint and prettier on its files and its own tests. The lead runs the full suite once per milestone. The browser runs are listed.

| # | Milestone | Size | Depends on | Browser |
| --- | --- | --- | --- | --- |
| M1 | **Facts and personas.** `DeviceFacts` from `device.features` (not the adapter), limits, adapter info with `isFallbackAdapter`, probes as facts. `fakeGpu.ts` fakes features, adapter info and `requiredFeatures`. Persona fact sets. No behaviour change | S | – | none |
| M2 | **Catalog, rules, resolver** (Opus). `src/profile/` types, the predicate language, the catalog's first entries, rules from today's behaviour, `resolve()` with explain trails, `support()`. The invariant tests 1–9 over personas. Node only, not wired in | M | M1 | none |
| M3 | **Paths in one place.** Move every facts read (star submission, moments format, KTX2 target, sample-rate probe, timer) behind `paths(facts)` and `effective`. Add the seam test | S | M2 | one parity page per changed path |
| M4 | **Wire into `Engine` and `View`** (Opus for review). `view.support`, `view.effective`, `view.explain`, the `support` notice kind, `warnOnce`, `strict`, `warnings`. Re-resolve on resize and device loss. Glare migrated. The ambient occlusion cap, World clamps, the slice pool, screen-space error and caster scale as limit notices | M | M3 | glare and translucency parity |
| M5 | **Inspector and emulation.** The Profile section (DOM-skeleton test), notices in Problems, `emulate`, Dyno `?persona=` | M | M4 | one inspector page, both themes |
| M6 | **`@cesium/next/gpu` entry point.** Move exports, update the surface and the import-boundary test. The main API keeps no GPU type | S | M4 | none |
| M7 | **Viewer migration and defaults.** One defaults table, the Viewer's overrides removed, its capacities resolved (questions 1 and 6) | S | M4 | the Viewer example |
| M8 | **The WebGL 2 renderer's facts and support rules,** with the WebGL 2 plan. Its persona and the required-content invariant | S | M2; the WebGL 2 renderer | per the WebGL 2 plan |
| M9 | **The worker mode.** Snapshot transport for support, effective settings and notices; strict validation from the snapshot; the API tests in both modes | S | M4; the worker spike | per the worker plan |

M1–M4 are the core. M5–M7 can run in parallel after M4. M8 and M9 wait on other plans.

**Later (not planned here):**

- Measured per-step costs recorded from real ticks.
- An opt-in governor that adjusts only `true` features under `auto`, to hold a tick-time target.
- An end-user fidelity bias for apps that offer a quality slider.
- Host-supplied storage for measured costs.
- Context facts from the host (power, user preferences).

## 9. Questions for the owner

Each has the lead's proposal. M2 starts from these unless the owner says otherwise.

1. **Engine defaults.** Should the engine turn shadows (`preferred`) and ambient occlusion (`extra`) on by default, now that automatic fidelity handles weak devices, so the Viewer's defaults and the engine's become one? _Proposal: yes. Parity tests pin their looks under `fixed`._
2. **Importance names:** `essential`, `preferred`, `extra`? _Proposal: yes. Three levels, a catalog default for each feature, per-view overrides._
3. **Feature values:** `false`, `true` (the engine picks the step) or a named step (pinned)? _Proposal: yes. It matches glare's `"auto"` and named tiers today._
4. **Fidelity modes:** only `"auto"` and `"fixed"`, with `strict` separate, and no `exact` mode? _Proposal: yes. A capture uses `fixed`, plus `view.converged()` from the refinement plan._
5. **Accuracy under hard limits.** Should a memory-forced raise of screen-space error stay automatic, reported with its effect on accuracy and carried into query results, rather than becoming an error? _Proposal: yes. The alternative is blank tiles._
6. **World capacities.** Should one default be derived from device limits, so the Viewer's smaller values go away? _Proposal: yes, unless the Viewer's values were chosen for a reason the code doesn't record._
7. **Emulation.** Should `emulate` be in `@cesium/next/gpu` for any host, or for development builds only? _Proposal: the advanced entry, never persisted by the engine, always shown in the inspector._
8. **Unknown hardware** gets the best supported step, with "no rule matched" in the inspector, rather than a cautious guess. _Proposal: yes. A wrong cautious bucket fails silently, as Unreal's device profiles do._
