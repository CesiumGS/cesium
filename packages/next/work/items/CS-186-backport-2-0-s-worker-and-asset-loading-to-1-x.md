---
id: CS-186
title: Backport 2.0's worker and asset loading to 1.x for 1.148.0
kind: external
state: planned
created: 2026-11-13
project: CS-19
waiting_on: CesiumJS 1.x
---

## Waiting on

Loading 1.x from a CDN or a bundler is a common struggle. Consider backporting 2.0's approach for 1.148.0: locate workers, wasm and assets from `import.meta.url` in the ESM build (no `CESIUM_BASE_URL`, nothing to copy), keeping the blob shim 1.x already uses for cross-origin workers. First collect the failures users actually report (forum, issues) to confirm this is what they hit. Coordinate with PR #13669 (WebAssembly in workers, CSP guide): it adds worker URL options and documents `CESIUM_BASE_URL` per policy, which this would change.

- **For:** CesiumJS 1.x
- **Where it is explained:** `docs/design/examples-and-the-gallery.md` (pages without a build)
- **Status (2026-11-13):** To bring to the team
- Formerly row 14 of the overall plan's follow-ups table.
