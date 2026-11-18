---
id: CS-580
title: naga-wasm is a dev dependency of @cesium/next, so CI validates the WGSL emitter's output
kind: work
state: planned
created: 2026-11-17
project: CS-199
needs: [CS-574]
touches: [packages/next/package.json, packages/next/test/irWgsl.test.ts]
tier_override: 1
---

The owner answered CS-574 with A on 2026-11-18. CS-51's validation test checks every emitted WGSL module with `naga-wasm` 30.2.0, which it loads today from `spikes/core-ir/node_modules`. The test skips when that's missing and fails when the CI variable is set, so CI fails until this lands.

## Done when

- `naga-wasm` 30.2.0 is a dev dependency of `@cesium/next`, pinned to that exact version, and `test/irWgsl.test.ts` loads it from there, not from the spike folder.
- The test runs (doesn't skip) in a fresh worktree after the worktree setup's `npm install`, and in CI.
- Nothing in a production build includes it (`scripts/checkBundle.mjs`).
- The full suite passes.
