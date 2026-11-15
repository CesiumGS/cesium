---
id: CS-40
title: Picks and outputs
kind: work
status: Planned
created: 2026-11-13
project: CS-9
needs: [CS-36]
---

The first half of the old milestone "picks, outputs and user code": picks and outputs on the WebGL 2 renderer. Needs CS-36. Its second half, user code, is CS-41, split out because only that half waits for Cesium IR's WGSL front end and API surface.

## Done when

Pick parity. `customShader` hook rows within tolerance for every hook Cesium IR accepts. Refused hooks report the same diagnostic on both renderers

## Files

- `src/render/webgl2/`

Detail: `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, its milestone table.
