---
id: CS-610
title: "The 2.0 repository's design: build system, CI/CD and release pipeline"
kind: work
state: planned
created: 2026-11-17
project: CS-609
---

## Done when

- The design sets 2.0's final layout once 1.x is gone. Its packages sit at the repository root, from CS-834's map, and `packages/next` is removed. CS-835's move goes straight into that layout. (The owner, 2026-11-21.)
- It says how parity and Dyno's baselines compare against 1.x after its source leaves: a pinned, published `cesium@1.x` as a dev dependency replaces `CESIUM_BUILD_DIR`, the in-tree engine imports and `cesium1x.ts`. (The owner, 2026-11-21.)
- Sandcastle stays in the repository for now, until it moves to a repository of its own, and the layout and build keep it working. (The owner, 2026-11-21.)
- It covers the build that publishes alpha.1's packages and the release pipeline, since alpha.1 publishes first. (The owner, 2026-11-21.)
- A reviewed design for the 2.0 repository's layout, build, test and release pipeline, compared against current practice, with what each choice replaces.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
