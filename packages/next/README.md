# @cesium/next — CesiumJS 2.0 WebGPU proof of concept

Clean-slate, WebGPU-only engine prototype. See `CESIUM2_WEBGPU_PLAN.md` at the repo root.

```sh
npm run build                               # at the repo root: 1.x build used by the parity harness
npm run dev --workspace @cesium/next        # dev server at http://127.0.0.1:5190
npm run test --workspace @cesium/next       # unit + 1.x parity (L0) tests
npm run typecheck --workspace @cesium/next
npm run bench --workspace @cesium/next      # needs the dev server; writes bench/results/*.json
```

Layout: `src/math` (float64 geodesy), `src/gpu` (device, timers, allocators,
mips, IBL environment), `src/io` (worker pool, glTF parsing),
`src/render` (frame graph, byte layouts), `src/shaders` (WGSL),
`src/scene` (Engine, World, View, ViewLink, Camera), `demo/`, `test/`.

Pages on the dev server:

- `/demo/` — multi-view demo (split, linked overview, second canvas, offscreen)
- `/parity/` — L2 image parity against 1.x (`runParity()` in the console)
- `/parity/models.html` — Khronos sample models, 1.x `Model` vs the 2.0 glTF
  path (`runModels()`)
- `/spikes/precision.html` — camera-relative precision of the prep kernel
- `/spikes/worker.html` — the engine running in a worker on an OffscreenCanvas
- `/spikes/indirect.html` — indirect vs direct draws in render bundles
- `/bench/baseline.html` — 1.x vs 2.0 performance baselines (draw scaling,
  picking, log depth, four views)
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
slang baseline`); set `BENCH_CHANNEL` to use another installed browser and
`BENCH_HEADED=1` to watch.
