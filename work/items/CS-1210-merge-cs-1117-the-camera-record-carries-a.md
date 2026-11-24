---
id: CS-1210
title: Merge CS-1117, the camera record carries a general projective transform
kind: decision
state: planned
created: 2026-11-24
project: CS-191
decider: owner
---

## Question

Merge CS-1117 into main? The camera works for any projection matrix (perspective, orthographic and off-axis), with picking, the snap, shadows, fog and points right in each, so CS-218's orthographic camera can follow.

Each quantity the engine derives from the camera (rays, origins, depth, planes, screen-space error) now comes from the projection, not from one eye point. Two fix rounds after an Opus review: the pick window and near-plane rays for any projection; then the snap's lines of sight start at the near plane, so walls behind the camera's plane in an orthographic view count. Perspective views behave exactly as before. The Lab's parity suites (selection, tileset, models, globe, heights) are identical between base and change in every non-timing field. One shader changed (the point-cull slack), bit-identical for perspective, its Metal output read, no new loops. `test/data/framesExplorerScenarios.test.ts`'s dish-tracks timed out on the replay under heavy load; its fix round found no cause in this branch: the scenario calls nothing it changed, main times out the same way at that load, and the branch passes alone in 57.6 s against the test's 60 s limit. The batch suite will compare it with main; a real difference stops the merge. It changes an owner path: `api/surface.txt` (the internal entry gains `lensStart` and loses two unused helpers). Translucency's ordering along orthographic rays stays as stated in the note (CS-1176). Checked by the orchestrator on the replay 95a50e47fe (patch and surface identical to the branch's): typecheck, tsc, surface, shaders, eslint, the work check and the full suite apart from the load-sensitive tests. Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes (dish-tracks compared with main), the orchestrator merges it with `merge-item.sh`. CS-218 can then start.
- B. B. Hold it: Nothing merges; CS-218 and the cameras milestone keep waiting.

Recommended: A. Merge it. Every review finding is fixed, perspective views and parity are unchanged, and the one test failure is load-made on main as well.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
