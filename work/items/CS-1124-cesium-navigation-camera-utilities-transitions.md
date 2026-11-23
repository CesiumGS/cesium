---
id: CS-1124
title: "@cesium/navigation: camera utilities, transitions and flights, and orbit, globe and inspect controllers, on core's public API"
kind: work
state: planned
created: 2026-11-23
project: CS-609
needs: [CS-1123]
---

> **Committed by the owner (2026-11-23), through CS-1123 A.** Generic: a host can use these, or replace them with its own tools.

## Done when

- A new capability package, `@cesium/navigation`, depends only on core's public API, with no React and no DOM widgets.
- It holds `fitBounds` and view-from-bounds, transitions and flights (including the dolly between perspective and orthographic), and the orbit, globe and inspect controllers that live in core today.
- `@cesium/ui`'s Viewer uses it. The package map, the import-boundary test, the owner paths (`packages/*/package.json`, `src/index.ts`) and the umbrella's entries include it.
