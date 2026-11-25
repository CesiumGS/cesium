---
id: CS-1358
title: Merge CS-556, glTF files load through the content-source seam
kind: decision
state: done
created: 2026-11-25
project: CS-191
decider: owner
answer: "A. A. Merge it: It joins a batch after CS-1188's merge; once the batch's full suite passes, the orchestrator merges it with merge-item.sh, joining CS-1188's inlet list for the model sink."
answered_at: 2026-11-25T15:38:31.570Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-556 into main, after CS-1188? Single glTF and GLB files load as a source through the content-source seam, beside glTF as 3D Tiles content, with stable feature IDs from picks.

A built-in gltf kind (a whole source) is registered under reserved module URLs and mapped to bundled modules on the engine's thread and in the content worker: engine.open({ url: "model.glb" }) gives content, world.add places it, Engine.loadModel stays as shorthand, it decodes on Jobs with the same parser 3D Tiles content uses, and EXT_mesh_features stable IDs come back from picks (CS-815). The seam gains ContentSinks.models (ModelBatch, ModelSink, experimental, two exported types: owner paths packages/core/src/index.ts and api/surface.txt) and SourceHost.textureTarget. Your answer, as given: 'Move it to CS-278 (Recommended)': animation playback through the content item moved to CS-278, and CS-556 closes as done. An Opus review found 3 Importants, all fixed in one round: the model sink had no trust boundary (now engine-only: only kinds registered by a reserved cesium: URL get it, it accepts only an asset the engine's own decoder produced, once, reads each field once with the matrix copied, and the engine settles the measured upload bytes); an outside kind could claim the gltf:file job type first (now reserved when the engine's sources start); and model draws always claimed identity set 0 (now each draw carries its own set). A scoped Opus check found no new Important. It found one older reach-through from an outside source to the engine kind's host via the draw sink's Proxy, which predates CS-556 and goes to CS-1189 (the sinks.draws exception). Its follow-ups are filed as CS-1346 (lights), CS-1347 (decoder credentials) and CS-1348 (glTF 2.1 references), and its loose ends are a proposal. Merge order: CS-1188 (one trust boundary for every content-source inlet) merges first in an earlier batch; this branch then joins CS-1188's inlet list for the model sink, keeping its engine-only rule, and the orchestrator carries that at the merge. It also touches io/worker.ts in CS-969's area. Checked by the orchestrator on the replay 5ac72ff69e (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge. Cheap gates: typecheck, tsc -p ., surface, shaders and eslint pass; the related tests had one failure, importBoundary's globe-only bundle check, which needs a packages/ui build the replay doesn't have (checkBundle: no packages/ui/dist/index.js), not this change; the batch builds before its full suite, which runs it.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins a batch after CS-1188's merge; once the batch's full suite passes, the orchestrator merges it with merge-item.sh, joining CS-1188's inlet list for the model sink.
- B. B. Hold it: Nothing merges; glTF files load only through Engine.loadModel, and CS-554's tile content has no model sink to build on.

Recommended: A. Merge it. It meets the done-when (animations moved by your answer), every review finding is fixed, and the older reach-through is filed with CS-1189.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
