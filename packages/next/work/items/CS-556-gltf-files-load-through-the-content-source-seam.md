---
id: CS-556
title: glTF files load through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-847]
touches: [packages/next/src/io/**]
---


Single glTF and GLB files load as a source through the seam, beside glTF as 3D Tiles content. Related: CS-273 (glTF extension gaps).

## Done when

- A `gltf` kind, a `whole` source: `engine.open({ url: "model.glb" })` gives content, and `world.add` places it. `Engine.loadModel` stays as shorthand.
- It decodes on Jobs with the same parser 3D Tiles content uses.
- Its features carry stable IDs from `EXT_mesh_features`, and a pick returns them (CS-815).
- Animations play through the item. Node transforms as items follow CS-454's answer; until then they stay as today.
- glTF 2.1's external references are not required. When Khronos publishes its schema, a follow-up is proposed.
- `npm run surface` is run, and `api/surface.txt` is committed.
