---
id: CS-241
title: "Frames 4b's carried-forward fixes: deformation models, stale store files, Mercator (Spherical), vertical datums by code"
kind: work
status: Planned
created: 2026-11-13
project: CS-189
---

## Done when

Candidates that need a deformation model's grids load them; a crashed run's `.partial` files and dropped grids are swept from the store; EPSG 1026 uses PROJ's conformal sphere in `gridFactors`; the vertical-grid diagnosis compares datums by code; `ESRI_crs`-only tilesets are placed; an area of interest from a bounding volume is tested on the Moon.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 4b".
