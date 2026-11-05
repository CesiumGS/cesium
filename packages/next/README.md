# @cesium/next — CesiumJS 2.0 WebGPU proof of concept

Clean-slate, WebGPU-only engine prototype. See `CESIUM2_WEBGPU_PLAN.md` at the repo root.

**Setup, once per machine** (nothing here is committed):

```sh
npm install                                 # at the repo root
npm run setup --workspace @cesium/next      # the 1.x build, the CesiumJS releases Dyno and the benchmarks run, the Slang WASM build
```

`setup` builds this repository's 1.x (`npm run build` at the root) if
`Build/CesiumUnminified` is missing, and fetches the catalog's default
CesiumJS releases from npm into `~/.cesium-bench/cesium` (or
`BENCH_CESIUM_DIR`), checked against the registry's integrity hash. The dev
server also fetches a missing release the first time a page asks for it.
It also fetches the Slang toolchain, pinned to one release in
`scripts/slangTools.mjs` and checked against the release's SHA-256:

- the native `slangc` for this platform, into `~/.cesium-bench/slang-native`,
  for build-time Slang (`npm run shaders`, the engine's; `npm run slang`, a
  custom shader's stages);
- the WebAssembly build, into `~/.cesium-bench/slang-wasm`, which the dev
  server serves at `/slang-wasm/` for runtime Slang (`CustomShader.fromSlang`,
  Dyno's Slang playground).

`node scripts/slangTools.mjs` fetches just these. `SLANGC` and
`SLANG_WASM_DIR` still point elsewhere if set.

**Frames data** (`src/time`, `src/ephemeris`; `loadFrameData()`). `setup`
also fetches the data the frames layer needs, into `~/.cesium-bench/frames`
(or `FRAMES_DATA_DIR`), from the four URLs in `scripts/frameData.mjs`:

- NAIF's `de440s.bsp` (planets) and `moon_pa_de440_200625.bpc` (lunar
  orientation), each checked against a SHA-256 pinned in the script;
- IERS `Leap_Second.dat` (leap seconds), from `hpiers.obspm.fr` (the runtime
  also bundles NAIF's `naif0012.tls` table, `LeapSeconds.builtIn()`, and uses
  the download only when it expires later);
- `EOP-All.csv` (Earth orientation), from CelesTrak.

NAIF's generic kernels are public, but what the runtime loads are packs,
derived excerpts of them (each pack's manifest names its source file, that
file's SHA-256 and the span). The packs are written on your machine and never
redistributed by this repository. Credit: EOP data is "IERS, via CelesTrak";
leap seconds are "IERS". `--frames-span y0-y1` sets the excerpted years, both
included (default `2000-2050`):
`npm run setup --workspace @cesium/next -- --frames-span 2000-2050`.

The dev server serves the store at `/frames-data/`, so restart it after a
first setup. `npm run test:data --workspace @cesium/next` runs the tests that
compare against the real store (they need setup to have run). Without a store,
`loadFrameData` rejects with a message saying to run `npm run setup`.

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
real one (`WorkerPool`). Nothing generates code at runtime: under a
Content Security Policy only the workers need `'wasm-unsafe-eval'`, the
page nothing (`basisTranscoderEsm.ts`). `standalone/index.html` loads two compressed
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
- `/spikes/slang-kernels.html` — each Slang port against the hand-written
  WGSL it replaced (`spikes/slang/reference/`), timed and its outputs
  compared: the Slang migration's performance gate
- `/spikes/slang-probes.html` — each Slang feature the shaders need,
  compiled by `slangc` and validated in WebGPU (re-run per Slang release)

The engine's shaders are Slang (`src/**/*.slang`), compiled to checked-in
WGSL and reflection in `src/shaders/generated/` by `npm run shaders` (with
the `slangc` that `npm run setup` fetched, or `SLANGC=/path/to/slangc`);
`npm run shaders:check` fails if any is out of date. Runtime compilation
(custom shaders' Slang stages) uses the WebAssembly build the dev server
serves once setup has fetched it. `node scripts/dumpMsl.mjs module.wgsl
entry…` prints the Metal source Chrome compiles from a module.

`npm run bench` runs every page above in headless Edge via Playwright with
WebGPU developer features (unquantized GPU timestamps) on the high-performance
GPU. Pass suite names to run a subset (`precision indirect parity models
slang-kernels baseline alloc tileset`); set `BENCH_CHANNEL` to use another installed browser and
`BENCH_HEADED=1` to watch.
