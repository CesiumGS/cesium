---
id: CS-57
title: Our naga crate (Rust in development and CI only)
kind: work
state: planned
created: 2026-11-13
project: CS-10
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

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
