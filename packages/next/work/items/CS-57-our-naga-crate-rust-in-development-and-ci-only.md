---
id: CS-57
title: Our naga crate (Rust in development and CI only)
kind: work
status: Planned
created: 2026-11-13
project: CS-10
milestone: front ends and surface
---

Our naga crate (Rust in development and CI only). Needs nothing.

## Done when

- CI builds the crate from a clean checkout.
- The validation job runs on every pull request.
- The size is recorded.
- naga-wasm is removed from the spike folder's dependencies.
- No production build contains the crate's wasm, except the lazy chunk CS-58 adds; `checkBundle` guards this.

## Files

- `tools/naga/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
