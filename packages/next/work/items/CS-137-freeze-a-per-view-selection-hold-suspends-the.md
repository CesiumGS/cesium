---
id: CS-137
title: `freeze` (a per-view selection hold; suspends the governor)
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-136]
touches: [packages/next/src/streaming/Tileset3D.ts, packages/next/src/scene/converged.ts]
---

`freeze` (a per-view selection hold; suspends the governor). Needs CS-136.

## Done when

A test: after the deadline nothing new is selected, transitions finish, the hold is released when the promise settles.

## Plan

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
