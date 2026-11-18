---
id: CS-574
title: How CI gets naga-wasm for CS-51's WGSL validation
kind: decision
state: done
created: 2026-11-17
project: CS-10
decider: owner
answer: "A. devDependency of @cesium/next: A follow-up item adds naga-wasm 30.2.0 to packages/next's devDependencies and points the test at it; CI installs it with the rest."
answered_at: 2026-11-18T03:09:21.048Z
answered_via: question-tool
answered_by: owner
---

## Question

Should CI get naga-wasm 30.2.0 for CS-51's WGSL validation test by installing it in spikes/core-ir, or should @cesium/next take it as a devDependency?

CS-51's executor validates every emitted WGSL module with naga-wasm 30.2.0, loaded from spikes/core-ir/node_modules. The test skips when the package is missing and fails when the CI environment variable is set, so CI fails until one of these lands. The executor changed neither the workflows nor package.json. Until this is settled, the CI half of CS-51's first Done-when line is not enforced.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. devDependency of @cesium/next: A follow-up item adds naga-wasm 30.2.0 to packages/next's devDependencies and points the test at it; CI installs it with the rest. (cost: A new dev dependency in the main package's tree.)
- B. CI installs in spikes/core-ir: A follow-up item adds an npm install in spikes/core-ir to the CI workflow before the tests run; package.json stays as it is. (cost: A CI step that reaches into a spike folder; the test depends on a spike's lockfile.)
- C. Neither for now: CS-51 merges with the test skipping outside CI and failing in CI; a follow-up item records the gap. (cost: CI goes red on this test until a later choice.)

Recommended: devDependency of @cesium/next. The emitter is part of the engine, so its validator belongs with the engine's own tests rather than in a spike folder; it is a dev-only dependency.

If unanswered by 2026-11-18T17:00:00.000Z: Neither for now.

## Answer

Recorded in the front matter once answered.
