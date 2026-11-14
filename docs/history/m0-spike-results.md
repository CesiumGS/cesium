# M0 spike results

**What this holds:** The results of M0's de-risking spikes and the M0 close-out (r8). Moved from the overall plan (`CESIUM2_WEBGPU_PLAN.md`) on 2026-11-13, with its content and dates unchanged.

Two GPUs in the same Windows laptop, both D3D12 via Chromium: a low-end Intel
Xe-LPG iGPU and an NVIDIA Lovelace (RTX 40-series) laptop GPU. CPU and
wall-clock numbers in the NVIDIA runs were taken while other processes were
running unit tests and are noisy; GPU timestamps are quantized to 100 µs by
Chrome without its developer flag. Metal is deferred until a Mac is
available; M0 and M1 target Windows.

| Spike                                                        | Intel Xe-LPG                                                                                           | NVIDIA Lovelace                                                                     | Status                                       |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------- |
| L0 math parity                                               | ≤1e-12 relative vs 1.x core (CPU, GPU-independent)                                                     | same                                                                                | pass                                         |
| L2 image parity (`parity/`)                                  | Mean ΔE 0.05–0.91 (1.x gamma 2.2), 0.08–1.72 (exact sRGB); only AA edges differ; ≤1.6% pixels > JND    | Mean ΔE 0.05–0.91 / 0.08–1.72; ≤1.7% pixels > JND                                   | pass; FLIP below                             |
| Color pipeline drift                                         | Exact sRGB vs 1.x `pow(c, 2.2)`: +0.6–0.8 mean ΔE. Views expose `outputEncoding`                       | same                                                                                | measured                                     |
| Hi/lo precision (`spikes/precision.html`)                    | Max error ≈4e-8 × distance (0.04 µm at 1 m, 31 µm at 1 km, ≈4 mm at 100 km); naive float32 0.25–0.47 m | Bit-identical to Intel                                                              | pass on D3D12                                |
| Engine in a worker (`spikes/worker.html`)                    | Runs unchanged on an `OffscreenCanvas`; keeps rendering while the main thread is blocked               | not rerun                                                                           | pass                                         |
| Demo frame (657 draws × 3 views)                             | GPU 2.25 ms, CPU 0.7 ms                                                                                | GPU 0.38 ms, CPU 0.7 ms                                                             | —                                            |
| Indirect vs direct draws, 20k draws (`spikes/indirect.html`) | GPU in-pass 8.67 vs 4.37 ms; wall-clock gap 3–9 ms                                                     | GPU in-pass 0.75 vs 0.15 ms (≈30 ns/draw); GPU span ≈ in-pass; wall-clock gap ≈4 ms | **concern** (cost is per indirect call)      |
| CPU per frame with render bundles                            | 0.6–0.9 ms flat from 1k to 20k draws                                                                   | 0.3–0.4 ms flat                                                                     | pass                                         |
| MSAA feature IDs                                             | `r32uint` cannot be multisampled; `rg16uint` (lo16, hi16) with sample-0 pick reads                     | same                                                                                | resolved                                     |
| Slang (`spikes/slang.html`)                                  | —                                                                                                      | See below                                                                           | **pass**, perf gate needs unquantized timing |

**Indirect draws.** On NVIDIA the GPU-side cost of an indirect call is small
(≈30 ns), and the GPU span from first to last pass matches the per-pass sum,
so whatever Dawn adds happens off the GPU timeline (the ≈4 ms wall-clock gap at
20k draws). On the Intel iGPU the GPU cost itself doubles. Either way the cost
scales with the number of indirect calls, so M1 reduces them: one indirect draw
per batch of records sharing a mesh and material (GPU-compacted instance
lists), CPU tile-level culling before the bundle, and direct draws where the GPU
culls nothing.

**Slang (v2026.20, NVIDIA).**

- Ported the opaque shader and the prep kernel. The material is an
  `IMaterial` interface bound at link time: the engine module declares
  `extern struct Material : IMaterial`, and a separate module exports the
  implementation (`DefaultMaterial`, or a user `ToonMaterial`). With slangc the
  material module is precompiled to a `.slang-module` and linked; at runtime the
  WASM API composes the modules directly.
- slangc output validates in Chrome with 0 errors and 0 warnings and renders
  **pixel-identical** to the hand-written WGSL (mean ΔE 0.000). Prep-kernel
  precision is identical (max relative error 5.96e-8 for both).
- Corrects the r3 review: `SV_Target0/1` multiple render targets work,
  `SV_InstanceID` maps to `instance_index` (so `firstInstance` semantics hold),
  `nointerpolation` maps to `@interpolate(flat)`, and `[[vk::binding(b, g)]]`
  maps to `@binding/@group`, so Slang modules fit the engine's bind group
  layouts unchanged.
- GPU time, 20k draws, median of 3 alternating runs: Slang was 14–20% _faster_
  in two runs and 50% slower in a first single run — noise at this resolution
  (≈1 ms, 100 µs quantization). No evidence of a penalty; the ≤5% gate is
  re-run in M1's benchmark suite with unquantized timestamps.
- Codegen quirks to track: matrices are rebuilt from 16 scalar loads per use
  (transposed for `column_major`); one `i32` field got `@align(8)` (harmless
  here because the offset was already 8-aligned, but a layout risk); the hi/lo
  subtraction kept its grouping. Pin `column_major` in source, since the WASM
  API's sessions take no `-matrix-layout-*` flag.
- Runtime compiler: `slang-wasm.wasm` is 25.1 MB raw, 10.6 MB gzip, 7.7 MB
  brotli, plus 155 kB of JS. Load and instantiate 120–140 ms (local server),
  `createGlobalSession` ≈160 ms, compile opaque + ToonMaterial 220–230 ms cold
  and ≈58 ms warm. Output validates; its text differs from slangc's (different
  naming from linking source vs. precompiled IR) without functional change.
- **Decision input:** build-time Slang is viable as the engine and user
  authoring path. Runtime Slang works but costs ≈8 MB (brotli) and ≈0.5 s
  before the first compile, so it stays lazy, worker-hosted and optional, with
  offline compilation the recommended path, as [shaders.md](../design/shaders.md) proposed.

## M0 close-out (r8)

**Automated runner.** `packages/next/bench/run.mjs` drives every spike in
headless Edge through Playwright with WebGPU developer features (unquantized
timestamps) and the high-performance GPU, and writes one JSON file per run to
`bench/results/` with the adapter recorded. Playwright's bundled Chromium is
blocked from executing on some locked-down Windows machines, so the runner defaults to the
installed Edge (`BENCH_CHANNEL` overrides). The committed result file is the
reference M0 run on the NVIDIA RTX 3000 Ada laptop GPU.

**FLIP.** `parity/flip.ts` implements LDR-FLIP with separable filters. On
NVIDIA's own test pair (`images/reference.png` vs `images/test.png`, 1920×1080,
67 PPD) it scores **0.159691** against the reference's **0.159693**. Parity
results, mean / p95 per camera:

| Camera   | 2.0 with 1.x color (gamma 2.2) | 2.0 exact sRGB  |
| -------- | ------------------------------ | --------------- |
| oblique  | 0.0376 / 0.0609                | 0.0465 / 0.0649 |
| top-down | 0.0426 / 0.0516                | 0.0525 / 0.0619 |
| grazing  | 0.0276 / 0.0473                | 0.0335 / 0.0553 |
| far      | 0.0019 / 0.0006                | 0.0023 / 0.0006 |

L2 criterion (mean ≤ 0.05, p95 ≤ 0.2) passes everywhere with 1.x color
handling; with exact sRGB only top-down exceeds it, by 0.0025.

**1.x baselines (`bench/baseline.html`)**, matched flat-colored workloads,
one draw per box (as 1.x issues per tile content). `performance.now()` is
coarsened to 0.1 ms on this page, so small 2.0 CPU numbers are upper bounds.

| Hypothesis                     | Workload               | 1.x (WebGL)                                       | 2.0 (WebGPU)                                    |
| ------------------------------ | ---------------------- | ------------------------------------------------- | ----------------------------------------------- |
| H1/H2 per-frame CPU, API calls | 1,000 draws            | 3.6 ms, 6,140 calls                               | ≤0.2 ms, 34 calls                               |
| H1/H2                          | 5,000 draws            | 21.4 ms, 30,140 calls (≈6 per draw)               | ≤0.2 ms, 34 calls (constant)                    |
| H8 creation + first frame      | 5,000 draws            | 637 ms (geometry + shaders built on first render) | 295 ms (to investigate: bundle/canvas setup)    |
| H3 log depth                   | 5,000 draws, on vs off | 21.7 vs 22.2 ms                                   | n/a                                             |
| H5 picking                     | 5,000 draws            | 4.8 ms blocking (pick re-render)                  | ≤0.2 ms main thread; result ≈5 ms later (async) |
| H10 multiple views             | 4 views × 1,000 draws  | 11.9 ms CPU/frame, 4 scene copies                 | ≤0.3 ms CPU/frame, 1 shared world               |

- H3 is not shown by this workload: it is CPU-bound, not fill-bound. It needs a
  fill-heavy scene (dense photogrammetry, M2).
- H4, H6 and H9 need 3D Tiles and the globe (M2–M3).
- Steady-state allocation (GC) measurement needs cross-origin isolation
  (`measureUserAgentSpecificMemory`); added to M1 with the zero-allocation gate.
- Caveat: 1.x does more per frame than this 2.0 prototype (more features in
  its command path), so these ratios overstate what full feature parity will
  keep. They do show where 1.x's cost comes from: work and API calls per draw.

**Slang performance gate.** With unquantized timestamps, two full runs gave
+1.9% and +8.2% GPU time for Slang-generated vs hand-written WGSL at 20k draws
(≈1 ms frames). Run-to-run variation is about ±6% at this scale, so the ≤5%
gate is **not resolved, not failed**. It moves to M1, measured on the PBR shader
(heavier, so codegen differences show) with more rounds.

**M0 exit.** Foundations, multi-view, GPU-driven submission, parity harness
with FLIP, precision, worker, Slang correctness and 1.x baselines are done on
Windows. Carried into M1: the Slang performance gate, steady-state allocation
measurement, the 2.0 first-frame cost, and the per-indirect-call cost
(batching). Deferred: the Metal precision run (done r50: it failed in the
float form and passes in the integer-assisted one, [architecture.md](../design/architecture.md), "Render world and draws (render/): GPU-driven from M1").
