---
id: CS-452
title: How should semantic metadata reach the engine, and what does picking mean in splats and point clouds?
kind: decision
state: planned
created: 2026-11-14
project: CS-191
decider: owner
---

## Question

How should semantic metadata reach the engine as world models mature, and what does "what did I pick?" mean in Gaussian splats and point clouds? Those have no surfaces or per-feature triangles, so a pick may come from a learned or labelled field rather than a feature ID on a mesh. Related: the query interface, point clouds and vector tiles with the vector renderer, and 3D Tiles metadata, which isn't planned yet.

Detail: `docs/design/semantic-metadata-and-picking.md`; `docs/design/ray-queries-where-they-run.md`.

## Options and recommendation

- Brainstorm it in its own session now, and file what it decides.
- Brainstorm it with the vector renderer's plan, when point clouds and vector tiles arrive.
- Leave it until splats or point clouds are planned.

Recommendation: with the vector renderer's plan, since point clouds, vector tiles and metadata meet there; earlier only if a host asks for semantic picks.

## Answer

Open.
