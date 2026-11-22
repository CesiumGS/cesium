---
id: CS-964
title: A small coordinate contract in core, implemented by crs-proj or the host and registered per engine (CS-959 A)
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-959]
---

> **Committed by the owner (2026-11-22), through CS-959 A.** Source: the Fable seams review (`fable-review-seams.md` in the shared notes). Before beta.1.

## Done when

- `@cesium/core` defines a small coordinate contract that names and converts coordinate systems. `crs-proj`, or the host, implements it, registered per engine.
- The content-source seam, `CoordinateService` and CS-882's seam use that contract, and no row names a coordinate system that nothing can convert.
- A test registers a host's own implementation and shows a source's rows converted through it.
