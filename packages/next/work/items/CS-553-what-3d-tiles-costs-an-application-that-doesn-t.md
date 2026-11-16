---
id: CS-553
title: What 3D Tiles costs an application that doesn't use them, measured as the seam's baseline
kind: work
state: planned
created: 2026-11-16
project: CS-191
touches: [packages/next/scripts/checkBundle.mjs]
---

Measure what 3D Tiles costs an application that doesn't use them: the bundle size and the start-up work an application with no tileset pays today. The owner's call (CS-551) builds the content-source seam now, so this isn't a gate any more, but it's the baseline the seam's work is checked against, as `docs/design/modular-renderer.md` asks.

## Done when

- `scripts/checkBundle.mjs` (or a check beside it) reports the bytes an application with no tilesets pulls in from the streaming code, and what it is, file by file.
- The figure is recorded with its commit and how it was taken, so CS-554 can show the seam moved it.
