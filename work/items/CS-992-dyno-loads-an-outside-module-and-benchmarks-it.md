---
id: CS-992
title: Dyno loads an outside module and benchmarks it as it does the built-in sources
kind: work
state: planned
created: 2026-11-22
project: CS-389
---

> **Committed by the owner (2026-11-22).** Source: the same request (CS-991).

## Done when

- Dyno's benchmark suite loads an outside module, given as a package or a path outside the repository, and drives it as it drives the built-in sources: with the same scenes, recorded camera paths and metrics.
- Its runs record the module's name, version and source beside the engine's commit.
- A test runs the suite against a small outside module, which proves the loader with nothing copied into the repository.
