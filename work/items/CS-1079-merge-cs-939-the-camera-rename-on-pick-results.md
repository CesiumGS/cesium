---
id: CS-1079
title: Merge CS-939, the camera rename on pick results
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

Merge CS-939 into main? It renames public fields: PickPositionResult.cameraRecord becomes camera, CorePick.camera (the pose) becomes pose, and CorePick.cameraRecord becomes camera, with no alias for the old names, as CS-935 A and CS-944 A asked.

The readers in the crs and frames packages, the tests, the handbook's API map and the doc comments move with it. A type test pins PickCamera and SnapCamera to CorePick.pose and refuses CorePick.camera; tsc checks it, since vitest's type checks are off. api/surface.txt lists names only, so it doesn't change. A fresh Claude review (Sonnet) of the replay on main found nothing Important: no reader is left on the old meaning, in TypeScript, JavaScript or Markdown across packages, apps, examples, parity, spikes, handbook and docs. Its one Minor, a comment on the internal PickTick's camera and cameraRecord, which are the reverse of CorePick's, goes into a later round. Checked by the orchestrator: gates on 4f674d9baa (on 92f610f862) passed: build, npm test 6,827 of 6,827, checkBundle, surface, eslint and handbook. test:data failed frameCatalog and dish-tracks under load, and both passed alone (3 of 3, 60 of 60). Replayed again on main with CS-613 and CS-943 as ba973cc9a6 (patch identical outside work/): npm ci, tsc --build, tsc -p . and surface --check (1,872 exports) clean, and its tests 5 of 5. Code that reads CorePick.camera as a pose breaks at compile time only where the shapes differ.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the old names stay.

Recommended: Merge it. It is the rename the owner chose, the review found no reader left on the old meaning, and the gates pass.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
