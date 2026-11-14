# Examples and the gallery

**What this holds:** How examples are built and shown: the gallery, pages without a build, and the rules examples follow. Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Three kinds of pages, kept apart:

- **The viewer** (`viewer/`): the development and debugging tool (content
  tabs, stats, selection policy, parity toggles). Not an example.
- **Harnesses** (`parity/`, `bench/`, `spikes/`): test pages the runner
  drives, listed in the viewer's panel.
- **Examples**: what users and stakeholders see, one per feature or use
  case (real-time tracks, very large CAD, splats, multi-view, clamping,
  custom shading).

**One gallery page that swaps examples, not a page per example.** Each
example is a module under `examples/<slug>/` exporting its metadata
(title, description, labels such as "3D Tiles" or "Defense", required
tokens) and `run(context)`, which builds its scene in a world and returns
a disposer. The gallery keeps one engine and canvas, lists examples with
search and labels, switches with `?example=<slug>` (deep links, back
button) without reloading, and shows each example's source. Switching
exercises content in and out of a live world, which the engine is built
for (r27). Kept small and self-contained in the PoC; eventually the
gallery is Sandcastle (`packages/sandcastle`), so example modules follow a
shape Sandcastle can host (editable source, sharing, gallery metadata).
Built in Dyno (r47, Real-time tracks increment 4) with the real-time
tracks example; not yet: search and labels as filters, editing the
source.

**The Slang playground (r50).** A second example: a live shader editor
beside a viewer. Edit Slang custom shader stages (`import cesium;`,
`vertexMain` and `fragmentMain` against the user contract, §3.4) and see
them on content as you type.

- _Why now._ It is the first user-facing use of runtime Slang
  (`CustomShader.fromSlang`: the WebAssembly build in a worker). It is
  where the Slang-first migration's open questions show (§3.4): the WASM
  build's size and compile latency are measured on every edit, in the
  page.
- _How it works._
  - An editor with presets (bands by height, a pulse in time, toon steps,
    normals, a vertex twist).
  - It compiles after a short pause in typing and keeps the last shader
    that compiled. A compile error shows with its line and leaves the
    content drawing the last good shader.
  - The status line shows the compile time and the WGSL's size; the
    generated WGSL can be shown.
  - Targets are the repository's sample glTF models, placed on the
    terrain, with tilesets later.
  - A new shader re-places the model with it: the asset's upload is
    cached per world, so that costs only draws. A live swap
    (`World.setDrawShader`, moving draws between batches) is the next step
    if tilesets need it.
- _Setup._ The WASM build (10 MB, pinned with slangc in
  `scripts/slangTools.mjs` and checked against the release's SHA-256) is
  fetched by `npm run setup` into `~/.cesium-bench/slang-wasm`. The dev
  server serves it at `/slang-wasm/` without `SLANG_WASM_DIR`. Without it
  the example says how to get it.
- _The lookdev stage (r51)._ The example takes the gallery's side layout
  (`layout: "side"`: the view and the panel side by side, not an overlay)
  and starts with the globe off.
  - _Camera._ Orbit controls (`viewer.setControls("orbit")`: an
    `InspectController` around the model, the globe controller disabled)
    and a Focus button that frames the model.
  - _Stage._ Globe (off, ellipsoid, terrain); background colors; a
    procedural environment light (studio, sunset, overcast, dark) or the
    atmosphere; the sun (key, soft, off, time of day); a turntable.
  - _Models._ Procedural shapes, the repository's samples, a few Khronos
    samples by URL, any CORS-enabled glTF URL, and a local `.glb`.
  - _Presets._ 24, in groups (light and view, patterns, noise, materials,
    vertices), sharing noise and hue helpers.
  - Settings and the source persist in `localStorage`.
- _The editor (r51)._ CodeMirror 6, as Shadertoy uses (version 5 there).
  - _Highlighting._ The C-like stream mode, extended with Slang's keywords,
    the HLSL-style types and the contract's types.
  - _The Slang language server._ The WebAssembly build's `LanguageServer`
    runs in its own worker: diagnostics as you type, completion,
    signature help, hover and go to definition (Cmd/Ctrl-click, F12).
    Documents live in the build's file system too (`/user.slang`), and
    edits arrive as `didChangeTextDocument`. This is how Slang's own
    playground drives it: without the file there are no diagnostics or
    completions.
  - _Hover._ As in VS Code: the signature, highlighted, and its doc
    comment. The server's "Defined in user.slang(4)" is replaced by go to
    definition. Symbols from the contract say so, with a link into the
    Contract reference.
  - _The Contract reference._ The `cesium` module as the user's shader
    imports it, read-only and highlighted. This is Shadertoy's "Shader
    Inputs" panel, for a module. Go to definition opens it at the line.
  - Compile errors from `slangc` show as diagnostics too, where the server
    found none.
- _No globe flash._ `Viewer.suspendPresentation()` keeps the canvas from
  presenting while a caller sets a scene up.
  - It is ref-counted and returns a disposable resume function.
    `ViewerOptions.suspendPresentation` suspends from creation;
    `resumePresentation()` ends that suspension and
    `suspendPresentationUntil(promise)` ties one to a promise.
  - The container carries `data-cesium-presentation-suspended`, so an
    application can draw its own loading screen.
  - The practice is the same as Android's `postponeEnterTransition` and
    Unity's `allowSceneActivation`: the caller says when the first frame
    is ready, and the engine holds that frame until then.
  - The gallery creates its viewer suspended and resumes after each
    example's setup. Its spinner is centered on the view.
  - `suspendPresentation({ hide: true })` hides the canvas instead of
    keeping its last frame. Use it for new content; keep the last frame
    for an edit of the scene in view. The canvas shows again only once a
    new frame is drawn, otherwise it would present the stale frame once.
    The gallery hides on every switch, in a layout effect, so the old
    example never paints under the new one's title (r52).
- _Lookdev only (r52)._ The stage has no globe, timeline or credits. The
  key light is the sun, set by direction at the stage (`setSun`: key, soft
  key, top, back, off), and `Viewer.creditsShown` hides the credits while
  no attributed data is in view. The example restores all three when it's
  left.
- _Errors where they're seen (r52)._ Compile errors appear in a list under
  the editor, each a link to its line, with a lint gutter. Model errors
  appear as a banner over the view that says what failed to load and why.
  A failed model returns the selection to what is shown, so recompiles
  don't retry it. Compile errors are kept against the text that was
  compiled, so an edit never leaves a stale mark.
- _Fixed on the way (r52)._
  - **Re-placing a model lost its textures.** `addModel` closes an
    asset's decoded images after upload, and removing its last placement
    frees the upload. Placing the same parsed asset again uploaded from
    closed, 0×0 images, and WebGPU rejected the infinite mip count. The
    engine now says so, naming the fix. The playground adds the new
    placement before removing the old one.
  - **Turning the globe off drew black frames.** `SlicePool.release`
    destroyed the imagery array while the world's bind group still named
    it, so every submit failed. It now unbinds the array (the placeholder
    again) first (test/slicePool.test.ts).
- _Three design problems these bugs showed, addressed (r53)._
  - **Asset ownership: explicit handles.**
    - `engine.loadModel(world, url)` and `engine.uploadModel(world, asset)`
      return a `ModelResource` the caller owns. `model.place(options)` is
      the only way to place, returning a `ModelPlacement` (was
      `ModelInstance`).
    - A model is freed once its handle is released and no placements
      remain, so removing placements never frees a model still held. A
      one-off is `using model = …; model.place(…)`, and the placement keeps
      it until removed.
    - Source data (decoded images) is released at upload unless
      `releaseSourceData: false` (Filament's `releaseSourceData()`, Unity's
      `markNoLongerReadable`). Uploading a released asset again throws,
      saying why. The handle keeps only what placing needs (node matrices,
      lights, feature tables), not the geometry. Bevy's `Handle<T>` and
      Filament's `FilamentAsset` are the precedents.
    - Placements are bound to their model's world, so a mismatched world
      can't be expressed:
      - `setTransform`, `setVisible`, `setInstance` (GPU instances; was
        `engine.setModelInstance`);
      - `setShader`, a live swap through `World.setDrawShader` (the draws
        move between batches, nothing is placed again; the playground's
        edits use it);
      - `remove()`, idempotent; use after removal throws.
        Both models and placements are `Disposable`.
    - Each option lives with what it describes. `colorTransfer` and `axes`
      moved to the model. Placements take `modelMatrix | at` and
      `parent | heightReference` as discriminated unions. `collision` and
      `underlay` are engine-internal.
    - One source of truth per fact: `bounds()` follows the live transform
      (the `center` and `radius` fields are gone), `bytes` is the model's,
      and `draws` and `lights` are read-only.
    - Leaks are visible. A `FinalizationRegistry` warns when a handle is
      garbage-collected unreleased (unless its world was destroyed), and
      the inspector's memory section lists models, held handles and leaks.
    - Tiles upload, place and release, keeping the source data until the
      placement succeeds so a capacity failure still retries. Vector layers
      share one upload per model across their pools.
  - **Fault isolation: errors reported, damage contained.**
    - `engine.errors` and `engine.onError` replace console-only errors.
      Kinds are shader, pipeline, resource, frame and device, each distinct
      message kept once with a count. The inspector's Problems section
      shows them.
    - A custom shader or pipeline that fails already drew with the
      engine's: it's reported now.
    - The engine's device records each texture it destroys and each view's
      texture (`gpu/textureTracking.ts`, instance properties on its own
      objects, nothing global). A texture set binding a destroyed texture
      has its batches skipped, and an imagery array destroyed while bound
      is unbound. Either way the bad resource costs its draws, not the
      frame.
    - Each frame's submit runs in an error scope. A rejected frame is
      reported (`stats.rejectedFrames`) and every world binds again from
      its state (`World.rebind`).
    - The tracking caught a real ordering slip at once: growing the imagery
      array destroyed the old texture before binding the new one. Fixed,
      with a test.
  - **Gallery isolation: a viewer per example on one engine.**
    - The gallery keeps one `Engine` (device, pipelines, workers). Each
      example gets a fresh `Viewer` on it, `Viewer.create({ engine })`,
      destroyed when the example is left: its world goes with everything in
      it (`Engine.removeWorld` now removes the world's tilesets and views
      too).
    - A borrowed engine is never destroyed by the viewer, and a new viewer
      resets the engine-wide settings it relies on (the sky; the sun and
      render mode it sets anyway). `Engine.start` is idempotent.
      `ExampleContext.scope` (a `DisposableStack`) is disposed after the
      example's undo.
    - The playground's restore code is gone.
    - Sandcastle can work the same way: one engine per page, a viewer per
      run.
    - **Switching between examples (r53).** The example page's back link is
      now a switcher in the same space: "Examples / this one ▾ ‹ ›".
      - The menu lists every example with a picture of it, captured from
        its own canvas a moment after it starts (a frame rendered and read
        in one task, kept as a small JPEG in `localStorage`). Initials stand
        in until an example has run.
      - ‹ › and the `[` / `]` keys step through the examples (not while
        typing in a field or the editor).
      - Each example is a fresh viewer on the shared engine, so a switch
        costs only the example's own setup.
    - **The gallery page (r53)** is a grid of picture tiles. Each tile shows
      the example's captured thumbnail at 480×270 (a gradient with its
      initials until it has run), its title, two lines of description and
      its labels, and the whole tile is the link.
- _Declared uniforms as controls (r53)._ Slang's user-defined attributes,
  not a comment syntax: `cesium.slang` declares `Slider(default, min,
max)`, `Color(r, g, b)` (linear RGB), `Toggle(on)` and `Label("…")`. A
  shader writes `[Slider(4, 1, 8)] [Label("Steps")] uniform int steps;` and
  uses `steps` by name.
  - **Compile flow** (`slang.ts`, `slangControls.ts`):
    1. A reflection pass links the user module alone. Its JSON gives each
       global's type and its attributes with their arguments, so the
       declarations are checked by the compiler.
    2. Each declared uniform becomes a field of the shader's uniform
       buffer. Its declaration is blanked, and each use of its name is
       rewritten to the field (`uniforms.steps`; a `bool`, stored as a
       `u32`, as `!= 0u`). The rewrite works on identifier tokens outside
       comments and strings, and leaves names after a `.` alone, so a
       parameter named `roughness` doesn't touch `material.roughness`. A
       local that shadows a parameter is an error that says so. Lines keep
       their numbers in errors. (A first version used `#define`, which
       rewrote member accesses too.)
    3. The real compile follows.
       Supported types are float, int, uint, bool and float2-4, one
       declaration per line.
  - **Labels come from names** unless `Label` gives one (`linesPerUnit`
    reads "Lines per unit"). Slider steps are a power of ten about a
    hundredth of the range, so written defaults land on a step.
  - **`CustomShader.controls`** describes each one: name, label, kind
    (slider, color, toggle, number), type, default and range. A host sets
    them with `setUniform`, no recompile.
  - **The playground's Parameters panel** floats over the view's bottom
    left, collapsible (the state kept), so values are tuned while watching
    the model. It builds sliders, color pickers, toggles and number fields
    from them. Values are kept by name across
    compiles and visits until the shader changes that uniform's type or
    default, and Reset restores the defaults. Every preset where it makes
    sense has parameters (all but Normals), written one compact line each:
    `[Slider(1.5, 0.5, 6)] uniform float falloff;`.
- _Playground details (r53)._
  - **New:** starts a minimal shader, the model's own material, with the
    contract's inputs described. It is one undoable edit.
  - **Stage detection** (`slangStages`) now looks for definitions outside
    comments. A template comment naming `vertexMain` had made the compile
    wrapper call a stage that didn't exist.
  - **Layout:** the side layout is two rounded cards with a gap (no border
    line between the view and the panel), and the Preset and Model rows
    share one label and control grid.
- _Later._
  - Sharing a shader by URL (the source compressed in the hash), with its
    parameter values; and a `Choice` control (a labeled dropdown) beside
    `Slider`, `Color`, `Toggle` and `Label`.
  - **Displacement padding from the controls:** a large Spikes height
    pushes geometry past its bounds and parts are culled at the view's
    edges. A shader's `displacement` (which pads culling bounds) could
    follow its sliders' ranges.
  - **Fault isolation's remaining gap:** custom shaders' own textures
    (texture uniforms) aren't covered by the destroyed-texture tracking.
  - **Live style changes for tilesets** through `setShader` (a draw's
    shader swapped in place), instead of placing the tiles again.
  - **Checked-in thumbnails, generated by a script.** Captured thumbnails
    live in each browser's storage, so a first visit (and Sandcastle) sees
    placeholders.
    - A script (`npm run thumbnails`, a headless browser on the dev
      server) would open each example, wait for it to settle, and save
      `examples/<id>/thumbnail.jpg` at 480×270.
    - The gallery would show the checked-in picture unless this browser
      has a newer capture of its own.
    - Run it when an example changes, or check in CI that every example
      has one.
  - Tilesets with metadata (`fsInput.metadata`).
  - **A boundary-representation (B-rep) drawing example**: CAD solids
    drawn from their faces, edges and vertices, after vector drawing is
    generalized (lines and their styles beyond points), since it will
    want that drawing code for its edges and silhouettes. The geometry
    side: NVIDIA's open-sourced USD BRep
    (github.com/NVIDIA-Omniverse/usd-brep, Apache 2.0), which includes
    SMLib, a NURBS B-rep kernel (booleans, fillets, intersections,
    healing) with OpenUSD interop, in C++ and Python. To work out: how
    to use it from the engine, e.g. built to WebAssembly in a worker
    (tessellating faces and edges at the view's tolerance), or offline,
    converting B-rep to tiles with exact edges, and what it costs in
    size.
  - The same editor for vector styles (§13.9).
  - Exact highlighting from the server's semantic tokens, instead of the
    stream mode.
  - Readiness signals: resume presentation automatically once the content
    in view settles (tiles loaded, shaders compiled), so callers needn't
    say when.

**Pages without a build step (r39).** `npm run build:lib` writes
`dist-lib/`: one ES module (`cesium-next.mjs`, WGSL inlined), the content
worker and the Draco and Basis wasm under `assets/` (each located from its
importer's `import.meta.url`), and declarations under `types/`. A static
page (Sandcastle-style, no bundler, no TypeScript) imports it with a module
script. From another origin (a CDN) the files need CORS, and the worker
starts through a same-origin `blob:` module that imports the real script,
since browsers start workers only from the page's origin (`WorkerPool`);
`standalone/index.html` is the check, tested with the page and the library
on different origins (workers, wasm and KTX2 transcoding included). Not
yet: a classic-script (global) build, publishing, or a stable public API
surface; `exports` still points at the source for the workspace.

How cross-origin loading works, step by step:

1. **No base URL.** Every file the library loads is located from the
   module that loads it, fixed at build time: the worker from
   `cesium-next.mjs` (`?worker&url`), the wasm from the worker, each as
   `new URL(file, import.meta.url)`. Wherever the files are served, the
   URLs follow; there is no `CESIUM_BASE_URL` to set and no folders to
   copy.
2. **The module.** `import()` or `<script type="module">` of another
   origin needs `Access-Control-Allow-Origin` on the response (module
   scripts are always fetched in CORS mode). npm CDNs (jsDelivr, unpkg)
   send it.
3. **The worker.** `new Worker(url)` must be same-origin, CORS or not.
   `WorkerPool` compares the worker URL's origin with the page's: the
   same, it starts the worker directly; different, it starts a module
   worker from a `blob:` URL (same-origin by construction) whose only line
   is `import "<worker url>";`. The import is a cross-origin module fetch
   (CORS again). Inside, `import.meta.url` is the real CDN URL, so the
   worker's own chunks and wasm resolve against the CDN, not the blob. One
   blob URL per page, made on first use and kept.
4. **Wasm and data.** The worker `fetch`es its wasm (CORS) and content
   (whatever the content server allows, as in 1.x). The worker's origin is
   the page's, so content requests carry the page's origin.
5. **Not covered:** `file://` pages (browsers load no modules or workers
   there; the page says so). A consumer's own bundler re-bundling
   `dist-lib` is untested: bundlers that follow `new URL(…,
import.meta.url)` (Vite, webpack 5) should copy the worker, but the
   worker's wasm is referenced only from inside it.

**Content Security Policy** (with CesiumJS PR #13669, open, which moves
1.x's WebAssembly into workers and adds a CSP guide): 2.0 already runs all
WebAssembly (Draco, meshopt, Basis) in its workers; the page bundle has no
WebAssembly and no `eval`. Tested with the guide's split policy, the page
served `script-src 'self'` (plus `'unsafe-inline'` for the example's own
inline script) and the same-origin worker response `script-src 'self'
'wasm-unsafe-eval'`: everything loads (Draco, Basis KTX2), and the page
itself can neither compile WebAssembly nor evaluate strings. Fixed on the
way:

- **glTF `data:` URIs** were `fetch`ed in the worker, which `connect-src`
  checks (blocked under `'self'`); they are decoded in place now, as 1.x
  does.
- **Basis needed `'unsafe-eval'`.** The vendored transcoder glue (1.x's
  Emscripten build) generates functions from strings in four places of its
  embind runtime (`createNamedFunction`, `craftInvokerFunction`,
  `craftEmvalAllocator`, `__emval_get_method_caller`), and 2.0 evaluated
  the UMD script itself with `new Function`. `basisTranscoderEsm.ts` (a
  Vite plugin, `…/basis_transcoder.js?basis-esm`) now rewrites the glue at
  build time into an ES module with each generator replaced by the closure
  Emscripten emits under `-s DYNAMIC_EXECUTION=0`; every patch must match
  once or the build fails. Transcoding is unchanged: the 7 KTX2 samples in
  `Specs/Data` into RGBA8, BC7, ASTC and ETC2, every level (72 outcomes),
  are identical to the original glue's; model parity is identical. The
  output carries a notice of the change (Apache-2.0 §4(b): Basis Universal
  is Apache-2.0, Emscripten's runtime MIT), and the library build ships
  the repository's `LICENSE.md` with its third-party notices. The
  alternative, rebuilding the transcoder with Emscripten, stays open if the
  glue is ever updated.

Still open:

- **Strict separation needs same-origin workers.** A worker started from a
  `blob:` URL (the cross-origin path) takes the page's policy, so the page
  must allow `blob:` and the CDN in `worker-src` and `script-src`, and
  `'wasm-unsafe-eval'` itself; a policy on the CDN's worker response can't
  narrow it. As in 1.x. To let an application load the library from a CDN
  yet keep WebAssembly out of its page, `Engine.create` could take the
  worker's URL (served by the application, the guide's
  `workerModuleUrl`).

1.x already starts cross-origin workers through the same blob shim
(`TaskProcessor.createWorker`); what differs is step 1: 1.x finds workers,
wasm and assets from `CESIUM_BASE_URL` (`buildModuleUrl`), which pages and
bundler setups must set and populate by copying `Workers/`, `Assets/`,
`ThirdParty/` and `Widgets/` (follow-up 14).

Slugs name the use case, not the API (`real-time-tracks`,
`offshore-platform`, `campus-splats`). Example scenes are written so the
benchmark suite (§16) can load the same scene definitions, so a showcase
and its measurement never drift apart.

The gallery skeleton comes with the first example beyond the viewer
(likely with benchmark suite v1 or real-time tracks).
