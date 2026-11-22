---
id: CS-542
title: Every parity result names its oracle
kind: work
state: planned
created: 2026-11-15
project: CS-195
needs: [CS-541]
touches: [packages/next/parity/**, packages/next/bench/**, packages/next/vite.config.ts, docs/design/parity.md, docs/design/benchmark-suite.md]
---

A survey of the parity system on 2026-11-15 found that only the Dyno suite pins its 1.x and records it: its catalog's baseline is 1.147.0, and each run keeps the release's version and npm integrity (`results.configs[].source`) and the browser's `Cesium.VERSION` (`engineVersion`). The rest can't say which 1.x produced a result:

- The standalone parity pages (`parity/*.html`), `bench/baseline.html` and `bench/tracksBench.html` load `/cesium1x`, the repository's last `Build/CesiumUnminified` or `CESIUM_BUILD_DIR` (`vite.config.ts`, about lines 38 and 461). It's unpinned and may be stale, and nothing records its version.
- `bench/run.mjs` results (`bench/results/*.json`) record the 2.0 commit and the GPU, but no 1.x version, build commit or build path.
- Image parity (`bench/suite/images.mjs --parity`) defaults to the pinned baseline and its row's config ID shows the version, but the run file records no integrity hash, source or `Cesium.VERSION`. `--parity-engine 1.x` quietly switches to the repository's build.
- Dyno's `tree` and `ref` 1.x builds record a branch or a commit, not the 1.x version. Lab pages always load the repository's build, and Lab and Explorer sessions persist nothing.
- The docs: `docs/design/benchmark-suite.md` still says the baseline is "1.146.0 today" (about line 326) and offers the repository's build as a pinned 1.x (about lines 314 and 315). `docs/design/parity.md`, titled "1.x as oracle", never says which 1.x.

## Done when

- The parity pages, `bench/baseline.html` and `bench/tracksBench.html` load the pinned release from CS-541's oracle record, or refuse to run when the loaded 1.x's `Cesium.VERSION` differs from it.
- `bench/run.mjs` and `images.mjs` write the oracle into their results (its version, its integrity, and the `Cesium.VERSION` the page reported), beside the 2.0 commit. `row.parity` carries the oracle's source.
- `--parity-engine` with anything but the pinned release is flagged in the result as not the oracle.
- Dyno's `tree` and `ref` 1.x builds record their 1.x version (its `package.json` version and `Cesium.VERSION`).
- `parity.md` names the pin, and `benchmark-suite.md`'s stale lines are fixed.
- A test or check fails when a parity result has no oracle recorded.
