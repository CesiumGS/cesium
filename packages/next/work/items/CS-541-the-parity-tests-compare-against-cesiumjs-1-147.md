---
id: CS-541
title: The parity tests compare against CesiumJS 1.147.0, pinned
kind: work
state: planned
created: 2026-11-15
project: CS-195
touches: [packages/next/package.json, packages/next/vite.config.ts, packages/next/test/**, .human-in-the-lead/policy.json]
---

The unit-level parity tests compare against this repository's own 1.x, through the vite aliases `cesium-oracle` (`packages/core/Source`) and `cesium-engine-oracle` (`packages/engine/Source`). Merges from `main` change that 1.x: since the 1.146.0 base, 50 files changed, including a version bump and selection fixes. So a parity result can change without anyone touching 2.0, and nothing records which 1.x it was. The owner pinned the oracle to CesiumJS 1.147.0 on 2026-11-15.

1.147.0 is `@cesium/engine` 26.5.0, `@cesium/core` 0.1.1 and `@cesium/gltf` 0.1.1 on npm. The published packages ship their built `index.js` and the generated shader modules, so with them a fresh worktree needs no 1.x build.

The wrinkle: installed as dev dependencies inside this workspace, the release engine's own `import "@cesium/core"` would resolve to the workspace's `packages/core`, not the release's. The pinned packages have to be installed so they resolve each other, outside the workspace's links (for example under an alias, with the core dependency pinned too). The bench store's fetched releases (`~/.cesium-bench/cesium/<version>`) are another source, but they'd make the parity tests depend on `npm run setup`, which `npm test` avoids. A new pinned dependency is the owner's call: settle the packaging before adding one.

## Done when

- The oracle aliases resolve to the 1.147.0 packages, pinned to exact versions, and the release engine's own imports resolve to the same release.
- A test fails when the oracle isn't 1.147.0: it checks the version the oracle reports.
- Each parity result names the oracle it compared against, as far as the survey of the parity system (2026-11-15) finds is needed.
- `env.worktree_setup` in `.human-in-the-lead/policy.json` drops the four `gulp` lines, and the full suite passes in a fresh worktree set up with `npm install` alone.
