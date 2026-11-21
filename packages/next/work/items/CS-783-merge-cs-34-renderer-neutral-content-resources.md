---
id: CS-783
title: Merge CS-34, renderer-neutral content resources (texture images, queued uploads, ImageryCompositor)
kind: decision
state: planned
created: 2026-11-21
project: CS-9
decider: owner
---

## Question

Merge CS-34, which moves glTF textures, mesh uploads and globe imagery behind renderer-neutral interfaces made by each world's mirror (ContentTextures, queueUpload, ImageryDevice and ImageryCompositor), with the WebGPU implementations moved unchanged, so no content code holds a WebGPU object, into main?

Pure moves, a type check at each of four commits. The three GlobeImagery exceptions are gone from the import boundary's TIER_EXCEPTIONS, and a new test checks that content names no GPU type (a planted one fails, naming the file). Parity against its base, every value but timing: baseline 35 of 35, parity 67 of 67, models 148 of 148, tileset 27 of 27, selection 291 of 291, globe 81 of 81, translucency 69 of 69, indirect 10 of 10. Imagery varies run to run on the base itself (2.0's settled capture changes on the base in 5 of 8 cameras, by a hash probe); where the base repeats an image, the branch reproduces it bit for bit. lod and instances weren't run (broken on main: CS-568, CS-762). Nothing public changes (api/surface.txt unchanged); the content resources sit per world on WorldMirror rather than on RenderDevice as the plan sketched, since a slice array binds into one world. MeshData is kept through WorldMirror.queueUpload; on WebGPU the copy into staging still happens when queued, because callers may reuse their arrays. Outside its touches: the seam interface in src/scene/renderSeam.ts, the new src/scene/contentResources.ts and its WebGPU twin, uploads.ts moved to src/render/world, the scene/world helpers that now queue uploads, engineContent.ts, and the boundary and slice tests. Checked by hand, stacked on CS-23 (tested 165a95936e): both type checks, hitld work check (776 files), surface, npm test exit 0 (375 files, 6,410 passed, no unhandled errors), test:data exit 0, shaders:check (45 up to date). Your cold-start check (CS-715) passed at the tested commit: median first frame 1,348 ms without the board (run 2026-11-21T08-01-46-063Z-mac-apple); on A it runs again on main after the merge. Two things for later, not part of this merge: World's public TextureBinding and TextureSetOptions carry GPU types (World.createTextureSet, World.setImageryArray), so moving them behind the device changes the public World API, for CS-102 or you; and per-device slab placement waits until a world needs two devices, because it would break addMesh's synchronous CapacityError. Presentation: orch-11-merge-ready-CS-34.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the boundary tests, fast-forwards main, regenerates the views, runs the cold-start check on main and logs the merge; CS-35 and CS-36's content side can build on it.
- B. Hold it: Nothing merges; content keeps holding WebGPU objects, and the WebGL 2 device's content side waits.

Recommended: Merge it. Every gate passes, parity is unchanged on every suite that runs, the cold start is within budget, and it removes the last content exceptions to the boundary.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
