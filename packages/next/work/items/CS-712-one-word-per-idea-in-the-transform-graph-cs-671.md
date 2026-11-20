---
id: CS-712
title: "One word per idea in the transform graph: CS-671's name for smooth, warp and curved, and affine for rigid steps"
kind: work
state: planned
created: 2026-11-19
project: CS-17
needs: [CS-671]
touches: [packages/next/src/**, packages/next/test/**, packages/next/examples/**, packages/next/spikes/**, packages/next/handbook/**, packages/next/widgets/**, packages/next/scripts/**, packages/next/api/surface.txt, packages/next/README.md, docs/design/transform-graph.md]
---

## Done when

- The transform graph's differentiable, non-affine edge is **curvilinear** everywhere (CS-671): `curvilinear()`, kind `"curvilinear"`, `CurvilinearFrame`, `curvilinearFrame`, `isCurvilinearFrame`, `CurvilinearMap` in place of `Warp`, and so on. It replaces these four:
  - "smooth": `smooth()`, `SmoothEdge` (kind `"smooth"`), `SmoothSpec`, `SmoothForward`, `SmoothInverse`, `SmoothFrame`, `smoothFrame`, `isSmoothFrame`, `smoothEdgeOf`, `SmoothFrameSpec`;
  - "warp": `Warp`, `WarpScale`, `WarpStats`, `warpForward`, `warpInverse`, `DrawnWarp`, `BlendedWarp`, `ChangeableWarp`, `FunctionWarp`, `reprojectionWarp`, route steps of kind `"warp"`, and internal names such as `tileWarp` and `warpBounds`;
  - "curved" in code names, where it means a route through such an edge (`WorldCurvedClips`), but not B-rep curved surfaces or NURBS curves. "Curved" stays as the plain-prose adjective ("a curved route");
  - "deformer", in prose.
- Route steps say `"affine"`, not `"rigid"`, to match `AffineEdge`, since their matrices may scale. `NonRigidRouteError` is renamed to match, and so is `isRigid` if there is one.
- `api/surface.txt`, the handbook (the frames module card, `apiMap.ts`, the georeference and transform graph tabs) and `docs/design/transform-graph.md` use the new names, and the agent-first migration kit maps 1.x's `scene.verticalExaggeration` to the new name.
- `npm test`, both type checks, `npm run surface` and `npm run handbook` pass. No behavior changes: this is a pure rename, so tests run once at the end (the batching rule for refactors).

## Why

The owner, 2026-11-19: the rigid and curved cleanups are good, do those. Today one idea has four words. GPU programmers read "warp" as a group of threads, and the engine already uses subgroups (`src/gpu/GpuDevice.ts`).
