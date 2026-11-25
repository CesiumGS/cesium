---
id: CS-1331
title: 3D Tiles vector content through the vector path
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-261, CS-554]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.4, its item VT), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: the owner split 3D Tiles vector content out of CS-261 (Q5, "A: split it out (Recommended)"). Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- `3DTILES_content_gltf_vector` content arrives as glTF, through `io/gltfParse.ts` and the tiles module's content decode (CS-554), and becomes the vector path's records, with feature IDs and properties from `EXT_mesh_features` and `EXT_structural_metadata`.
- Legacy 3D Tiles 1.0 `vctr` and `geom` tiles are not this item's (a separate proposal).
- A fixture tileset from the extension's published samples draws, and picks return stable IDs. Its license is checked before it joins the catalog.
- The handbook's vector tab says what's built.
