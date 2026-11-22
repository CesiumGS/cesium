---
id: CS-815
title: Scene content has stable identity and semantic labels that don't depend on load order
kind: work
state: planned
created: 2026-11-21
project: CS-437
touches: [packages/next/src/scene/**, packages/next/src/query/**, packages/next/src/streaming/**, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

`PickResult.featureId` comes from a running counter (`worldScene.nextFeatureId`), so it depends on load order and changes between runs. Ground truth, datasets and world-model conditioning need IDs that stay the same. SimReady needs labels by taxonomy (USD `SemanticsLabelsAPI`). 3D Tiles and glTF carry feature IDs and metadata (`EXT_mesh_features`, `EXT_structural_metadata`).

Source: the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice (Omniverse Replicator and Isaac Sim, CARLA, AirSim, MuJoCo, Habitat, Cosmos, USD and glTF semantics). The owner put the four core seams in alpha.1. Why now: it changes scene items and picking. Rough size: medium. Decider: the executor, for the ID's encoding. How metadata reaches the engine overall is still CS-452, an open owner decision. This item settles the ID and label contract that CS-452 builds on, and anything it needs from CS-452 comes back as a question. Filed: 2026-11-21.

## Done when

- Every pickable thing has a stable ID: derived from content (source, content key, feature-ID set, feature ID), or supplied by the host on a scene item. It never depends on load order. A test loads the same content in two orders and gets the same IDs.
- Labels are keyed by taxonomy, mirroring USD's `SemanticsLabelsAPI` instance names. They're read from glTF `EXT_mesh_features` and `EXT_structural_metadata` and from 3D Tiles metadata, and set by the host on scene items.
- Picks, CS-813's ID images and ray hits (CS-535) all return the same ID and labels.
- `npm run surface` is run, and `api/surface.txt` is committed.
