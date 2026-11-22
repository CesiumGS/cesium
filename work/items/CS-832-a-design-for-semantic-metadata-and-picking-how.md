---
id: CS-832
title: "A design for semantic metadata and picking: how metadata reaches the engine, and what a pick means in splats and point clouds"
kind: work
state: done
created: 2026-11-21
project: CS-437
claimed_by: orch-11-CS-832
touches: [packages/next/docs/design/semantic-metadata-and-picking.md, packages/next/docs/design]
---

The owner answered CS-452 on 2026-11-21: design it now, together with CS-815 (stable identity and labels), which is in alpha.1 and builds on it. `docs/design/semantic-metadata-and-picking.md` is a stub today.

Source: the owner's answer to CS-452. Why now: CS-815, CS-813's ID images and SimReady's semantic labels (CS-802) all depend on it, and they freeze with alpha.1's seams. Rough size: medium (a design note). Decider: the executor writes it, and the owner reviews it. Filed: 2026-11-21.

## Done when

- `docs/design/semantic-metadata-and-picking.md` settles four things:
  - how metadata reaches the engine: 3D Tiles metadata, glTF `EXT_mesh_features` and `EXT_structural_metadata`, USD `SemanticsLabelsAPI`, and host-supplied labels on scene items;
  - how labels are keyed by taxonomy;
  - how they bind to CS-815's stable IDs;
  - how picks, ID images and ray hits return them.
- It says what "what did I pick?" means where there are no surfaces: in Gaussian splats and point clouds, a pick may come from a learned or labeled field. Each contract either has a defined answer or refuses with a reason.
- It leaves room for per-feature embeddings and semantic search (CS-817), without committing to a model.
- It names what CS-815 and CS-813 must carry, and anything left for the owner comes back as a decision.
- The owner has reviewed it.
