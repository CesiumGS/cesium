---
id: CS-168
title: "The per-family warp fixes: flatten, corridor, bend, the TM Jacobian"
kind: work
state: planned
created: 2026-11-13
project: CS-17
needs: [CS-53, CS-56]
---

The plan's task 9 moved its IR growth (arrays, bounded loops, missing ops) into Cesium IR. Its per-family fixes stay here: flatten measured in a gnomonic frame, C¹ corridor alignment (arcs and clothoids, as IFC 4.3's `IfcAlignment`), bend's injectivity as a `valid` parameter range, and the transverse Mercator Jacobian from the IR's autodiff. Needs transforms on Cesium IR (CS-53) and its bounded search (CS-56).

## Plan

`docs/superpowers/plans/2026-11-12-transform-graph.md`, its milestone table.
