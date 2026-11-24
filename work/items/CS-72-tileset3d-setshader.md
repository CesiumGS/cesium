---
id: CS-72
title: `Tileset3D.setShader`
kind: work
state: planned
created: 2026-11-13
project: CS-11
touches: [packages/next/src/tiles/**]
---

`Tileset3D.setShader`. Needs nothing.

## Plan

`docs/superpowers/plans/2026-11-13-materialx-live-graph.md`, its milestone table.

## Note from CS-71's review (2026-11-24)

Content no view shows takes the next shader at once, even one that hasn't compiled. `Tileset3D.setShader` needs a rule for resident tiles that aren't shown.
