---
id: CS-900
title: "Three USD readers compared in Dyno: the subset reader, LightUSD and full OpenUSD"
kind: work
state: planned
created: 2026-11-22
project: CS-191
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). The owner also asked for full OpenUSD to be included, for measurement only.

## Done when

- One Dyno instrument times three USD readers over the same six SimReady samples already in the setup store (Apache 2.0, licenses kept beside them):
  - the TypeScript subset reader from CS-833's spike;
  - LightUSD 1.0.0 in WebAssembly;
  - Pixar's OpenUSD 26.11.1 built for WebAssembly.
- For each reader it reports, with run IDs:
  - size (raw, gzip and Brotli);
  - start time, from creating a worker to a composed stage;
  - coverage of what CS-802's answer B needs: Robotics-Prop 5.0.0's visual features (FET001, FET006, FET009, FET011) and UsdPhysics;
  - what the host page must allow: threads and cross-origin isolation (COOP and COEP), `wasm-unsafe-eval`, `unsafe-eval`;
  - the upkeep: the build each needs and who maintains it.
- LightUSD's size is settled by measurement. Its own README and its npm package disagree: 1.6 MB against 7.1 MB.
- OpenUSD and LightUSD are built outside the repository, with the emscripten toolchain in the setup store. Neither becomes a dependency, and no build output is committed. The OpenUSD build is heavy, so it goes through the machine's gate (`dyno status`).
- The result goes to CS-901 as its options, with a recommendation.

## The owner's answers (2026-11-22)

- Evaluate LightUSD now, rather than keeping it only as a fallback.
- Include full OpenUSD in the same comparison, built for measurement only: the engine doesn't use it and nothing ships.
- Keep the six samples in the setup store, with their licenses.
