---
id: CS-944
title: "CS-939: CorePick already has a camera field; how is CorePick named?"
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: A
answered_at: 2026-11-22T18:37:22.368Z
answered_via: question-tool
answered_by: owner
---

## Question

CS-939 renames `cameraRecord` to `camera` (CS-935 A). `CorePick` already has a public field `camera: PickCamera`, the camera's pose in the anchor's coordinates, so the rename collides. How is `CorePick` named?

From CS-939's executor (2026-11-22).

## Options and recommendation

- A. Rename `CorePick`'s pose field to `pose`, then rename `cameraRecord` to `camera`, matching `PickResult`. Callers in `packages/crs` and the tests change too.
- B. Drop `CorePick.cameraRecord`, and read `feature.camera`. (Cost: it's lost on a miss, since `feature` can be undefined.)
- C. Keep `cameraRecord` on `CorePick`. (Cost: a different name from `PickResult`'s `camera`.)

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
