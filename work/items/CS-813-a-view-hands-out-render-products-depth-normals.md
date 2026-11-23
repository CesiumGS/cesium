---
id: CS-813
title: "A view hands out render products: depth, normals, motion vectors, and instance and semantic IDs beside color"
kind: work
state: planned
created: 2026-11-21
project: CS-437
touches: [packages/next/src/scene/renderTarget.ts, packages/next/src/scene/renderSeam.ts, packages/next/src/render/**, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

Synthetic-data tools and world models read more from a renderer than color:

- depth in meters, normals, motion vectors, and instance and semantic segmentation;
- each output paired with a label map.

Isaac Sim's and Replicator's annotators work this way, CARLA and AirSim have matching image types, and Cosmos Transfer is conditioned on depth and segmentation. Today `OffscreenTarget.read()` returns RGBA8 color only. The pick pass already keeps ID, value and depth textures internally (`src/render/view/pickDomain.ts`).

Source: the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice (Omniverse Replicator and Isaac Sim, CARLA, AirSim, MuJoCo, Habitat, Cosmos, USD and glTF semantics). The owner put the four core seams in alpha.1. Why now: it changes the public render-target API. Rough size: medium. Decider: the executor, for formats within the contract below. Filed: 2026-11-21.

## Done when

- ID images carry 64-bit stable IDs as two u32 words per pixel, with no lookup table. (The owner, 2026-11-21, answering CS-832's design questions.)
- A view or offscreen target asks for named outputs. Each readback is a typed array, paired with the frame's camera record (CS-814) and its scene time (CS-816).
  - `color`
  - `depth`: linear, in meters, along the optical axis
  - `normal`: in a named reference frame
  - `motion`: pixels per tick
  - `instanceId` and `semanticId`: uint32
- `depth` and `instanceId` ship first. The other names are reserved, and asking for one that isn't built yet is refused with a clear message.
- IDs in the images are CS-815's stable IDs, the same ones picks and ray hits return.
- Tests on `test/fakeGpu.ts` check the depth values and IDs against known geometry. A browser test on the executor's own server checks one real frame.
- `npm run surface` is run, and `api/surface.txt` is committed.

## Note (2026-11-23)

From the general-primitives review of a CAD or BIM host application's needs (2026-11-23): a host needs a region read (a rectangle of ID, depth, kind and planarity) and a held copy of the latest tick's products, readable synchronously.
