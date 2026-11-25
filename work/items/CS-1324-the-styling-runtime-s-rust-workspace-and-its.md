---
id: CS-1324
title: The styling runtime's Rust workspace and its WebAssembly package, loaded as job types
kind: work
state: planned
created: 2026-11-24
project: CS-190
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.9, its item RW), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: the owner put the styling runtime's beginnings in this project (Q2: "no labels until styling runtime, which we'll build the beginnings of as part of this project"), and placed its workspace (Q6: "at the root is right, but i think it needs a name for the directory that will eventually become the new repo name", then "cesium-runtime (Recommended)"). This supersedes "outside 2.0's monorepo" (CS-1129 A) until the move. Size: large. Decider: owner. Filed 2026-11-24.

## Done when

- The workspace exists at `cesium-runtime/` in this repository's root, with the crates CS-1129 names (the IR, the styling runtime; the 3D Tiles decoder's crate may start empty) and a WebAssembly package for browsers. Its build uses the approved Rust toolchain, as CS-57's naga crate does. It moves out later to its own repository, `cesium-runtime`.
- It stays self-contained: nothing in `packages/` imports its source, and 2.0 uses only its built WebAssembly package. A test fails on an import into `cesium-runtime/` from `packages/`.
- This changes the build pipeline: CI gains a Rust toolchain and a WebAssembly build step, and the packed-set and bundle checks learn the package. The commit says so, and the CI changes run under the repository's release rules.
- 2.0 pins the package's version, loads it into the worker pool's workers as job types (styling-runtime.md, section 6), and runs one trivial job end to end on transferred buffers, with no shared memory required. A test in 2.0 runs that job.
- The package's size and start time are measured through Dyno and recorded, since CS-1133 sets no budget.
- The handbook tab that describes the styling runtime says the workspace exists.

## Notes

Planned by the owner on 2026-11-24 ("Plan all four"). It is in 2.0.0-alpha.1 through CS-1342 (the styling runtime builds, ships and loads as job types), so the runtime exists before labels and the other runtime pieces build on it.
