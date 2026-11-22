---
id: CS-611
title: The 1.x code is replaced in the branch
kind: work
state: done
created: 2026-11-17
project: CS-609
needs: [CS-610, CS-887]
claimed_by: orch-11-CS-611
---

## Done when

- It runs before the package move (CS-835), on the owner's answer to CS-887, so the final `packages/core` doesn't collide with 1.x's. The pinned 1.x is `cesium-1x = npm:cesium@1.147.0`.
- Parity and Dyno's baselines run against a pinned, published `cesium@1.x` dev dependency, per CS-610, and their results are unchanged against the previous commit. The 1.x source then leaves the branch: the engine, widgets, `@cesium/core` and `@cesium/gltf` 0.1.x, and 1.x's build. Nothing under 2.0 imports from 1.x's tree, which takes in CS-811's decoder fix. (The owner, 2026-11-21.)
- Sandcastle stays in the repository and keeps working, until it moves to a repository of its own. (The owner, 2026-11-21.)
- 1.x on `main` is untouched. This branch alone drops it.
- The branch builds and tests 2.0 only. 1.x code that 2.0 still needs (the parity oracle) comes from a pinned release, not from the branch.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
