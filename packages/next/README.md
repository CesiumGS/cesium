# @cesium/next — CesiumJS 2.0 WebGPU proof of concept

Clean-slate, WebGPU-only engine prototype. See `CESIUM2_WEBGPU_PLAN.md` at the repo root.

```sh
npm run build                               # at the repo root: 1.x build used by the parity harness
npm run dev --workspace @cesium/next        # dev server at http://127.0.0.1:5190
npm run test --workspace @cesium/next       # unit + 1.x parity (L0) tests
npm run typecheck --workspace @cesium/next
npm run bench --workspace @cesium/next      # needs the dev server; writes bench/results/*.json
npm run build:lib --workspace @cesium/next  # the library for pages without a build step
```

**The library build** (`build:lib`, `vite.lib.config.ts`) writes
`dist-lib/`: `cesium-next.mjs` (one ES module, the shaders inlined),
`assets/` (the content worker and the Draco and Basis wasm, each found
relative to the module that loads it) and `types/` (declarations). A page
needs no bundler or TypeScript: a module script imports it, from its own
server or another origin (a CDN, with CORS headers, as npm CDNs send).
Browsers start workers only from the page's origin, so from another origin
the worker starts through a same-origin `blob:` module that imports the
real one (`WorkerPool`). `standalone/index.html` loads two compressed
models (Draco, Basis) that way; serve the folder (e.g. `python -m
http.server` in `packages/next`; pages opened as `file://` load no modules
or workers) and open `/standalone/`, with `?lib=<url of
cesium-next.mjs>` and `?data=<models folder>` to load either from
elsewhere.

Layout: `src/math` (float64 geodesy), `src/gpu` (device, timers, allocators,
mips, IBL environment), `src/io` (worker pool, glTF parsing),
`src/render` (frame graph, byte layouts), `src/shaders` (WGSL),
`src/scene` (Engine, World, View, ViewLink, Camera), `demo/`, `test/`.

Pages on the dev server:

- `/#/viewer` — Dyno's Viewer: one engine at a time (2.0 through
  `widgets/Viewer`, or a 1.x release), with sample glTF models and 3D Tiles,
  ion assets (`?asset=<id>`; `VITE_ION_TOKEN` in `.env.local`), iModels and
  a synthetic city; tile selection, globe, split view and overview inset,
  lighting, picking and the inspector
- `/demo/` — multi-view demo (split, linked overview, second canvas, offscreen)
- `/parity/` — L2 image parity against 1.x (`runParity()` in the console)
- `/parity/models.html` — Khronos sample models, 1.x `Model` vs the 2.0 glTF
  path (`runModels()`)
- `/spikes/precision.html` — camera-relative precision of the prep kernel
- `/spikes/worker.html` — the engine running in a worker on an OffscreenCanvas
- `/spikes/indirect.html` — indirect vs direct draws in render bundles
- `/bench/baseline.html` — 1.x vs 2.0 performance baselines (draw scaling,
  picking, log depth, four views)
- `/bench/alloc.html` — scene for the steady-state allocation gate (the
  runner profiles it with the sampling heap profiler)
- `/parity/tileset.html` — 3D Tiles content (b3dm/glb, feature IDs, batch and
  property tables) vs 1.x `Cesium3DTileset`, including picks
  (`runTileset()`). Private ion assets: put `VITE_ION_TOKEN=<token>` in
  `packages/next/.env.local` (gitignored) and open with `?asset=<id>`
  (`&pick=<property>`, `&zoom=<k>`), or run
  `ION_ASSET=<id> npm run bench -- tileset`
- `/spikes/slang.html` — Slang ports of the shaders (surface materials bound
  at link time), compared with the hand-written WGSL incl. the performance gate

The Slang spike uses checked-in WGSL from `spikes/slang/generated/`. To
regenerate it, download the official Slang release
(<https://github.com/shader-slang/slang/releases>) and run
`SLANGC=/path/to/slangc node spikes/slang/build.mjs`. To also test runtime
compilation, start the dev server with `SLANG_WASM_DIR` pointing at the
extracted `slang-*-wasm.zip`.

`npm run bench` runs every page above in headless Edge via Playwright with
WebGPU developer features (unquantized GPU timestamps) on the high-performance
GPU. Pass suite names to run a subset (`precision indirect parity models
slang baseline alloc tileset`); set `BENCH_CHANNEL` to use another installed browser and
`BENCH_HEADED=1` to watch.
