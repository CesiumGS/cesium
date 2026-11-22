---
id: CS-671
title: What do smooth nodes get called instead?
kind: decision
state: done
created: 2026-11-17
project: CS-17
decider: owner
answer: Affine, curvilinear
answered_at: 2026-11-20T02:18:12.000Z
answered_via: question-tool
answered_by: owner
---

## Question

The owner, 2026-11-17: "i kind of hate smooth node as a name now, we'll need to rename that." Smooth nodes are the transform graph's differentiable, non-affine nodes (`docs/design/transform-graph.md`). What should they be called in code, docs and the handbook?

## Options and recommendation

Framed 2026-11-19 from `docs/design/transform-graph.md`, the code and the transform-graph examples. Today one idea has four words: "smooth" (the graph's edge), "warp" (the frames layer's `Warp` and route steps), "curved" (clips) and "deformer" (prose).

- Warp: one word from the graph to the GPU, the smallest rename. Dropped: GPU programmers read "warp" as a group of threads, and the engine uses subgroups.
- Deform: right for exaggeration and subsidence, wrong for a projection, geographic to geocentric, or seismic time to depth.
- Nonlinear: strictly wrong, since an affine map with a translation is already nonlinear.
- Remap: collides with shaders' value-range `remap`.
- Matrix and function: names what the user supplies, but affine edges take a time callback too.
- Affine and curvilinear (recommended): a one-to-one map of space is affine exactly when it keeps straight lines straight (the fundamental theorem of affine geometry), so the other edges are the ones that bend lines. "Curvilinear" is geodesy's word for coordinates whose lines are curves, and it tells API users why such an edge has no 4×4 and why the engine subdivides geometry through it.

## Answer

Affine and curvilinear (owner, 2026-11-19). The edge is `curvilinear()`, kind `"curvilinear"`, with `CurvilinearFrame`, `curvilinearFrame` and `CurvilinearMap` in place of `Warp`. "Curved" stays as the plain-prose adjective ("a curved route"). The rename is CS-712.
