---
id: CS-135
title: Public reads (`view.refinement`, `onRefinement`, `stats.loop`)
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-134]
touches: [packages/next/src/scene/View.ts, packages/next/src/scene/Engine.ts, packages/next/src/index.ts, packages/next/api/**]
---

Public reads (`view.refinement`, `onRefinement`, `stats.loop`). Needs CS-134.

## Done when

The API reference test passes; the levels are tested on a fake scene (drawn, then correct after a compile, then converged after streaming).

## Plan

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
