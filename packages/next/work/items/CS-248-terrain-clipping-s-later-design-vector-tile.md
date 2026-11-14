---
id: CS-248
title: "Terrain clipping's later design: vector-tile boundaries, holes, and the 0.1 ms budget"
kind: work
status: Proposed
created: 2026-11-13
project: CS-189
---

## Done when

A brainstorm after plan 5 on what the built `ClipSet` doesn't cover: boundaries from vector tiles within the owner's 0.1 ms budget, polygons with holes in terrain clips, and the rest of the owner's list.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 3; `docs/design/bodies-frames-and-engineering-coordinates.md`, "Plan 5 design input: clipping, beyond the first terrain clips".
