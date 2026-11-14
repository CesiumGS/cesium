---
id: CS-225
title: The GPU snap pass, replacing 4b's CPU stand-in
kind: work
status: Planned
created: 2026-11-13
project: CS-188
milestone: 5f design space
---

## Done when

On the corridor, GPU snaps agree with the CPU stand-in within the stated tolerance over a grid of cursor positions, results keep `SnapResult`'s shape with a tolerance each, and snapping no longer needs retained CPU geometry (which also closes 4b's carried snapping occlusion and scratch-buffer items).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 13.3.
