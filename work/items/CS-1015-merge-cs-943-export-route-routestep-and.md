---
id: CS-1015
title: Merge CS-943, export Route, RouteStep and Recordable
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, reruns the gates if main's code moved, fast-forwards, regenerates the views and logs the merge."
answered_at: 2026-11-23T04:11:44.780Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-943 into main? Route and RouteStep are exported from @cesium/core and Recordable from @cesium/ui, as you committed, so the library build's declaration check has nothing pending. It adds those three public names through owner paths (each package's src/index.ts and api/surface.txt).

Route and RouteStep, declared in packages/core/src/camera/route.ts, were exported only from @cesium/core/internal; Recordable, in packages/ui/src/inspectable.ts, from no entry; the API names all three in public signatures. Each now has a doc comment. The umbrella re-exports @cesium/core, so it gains Route and RouteStep with no change; it doesn't re-export @cesium/ui, so Recordable stays in @cesium/ui. scripts/checkDeclarations.mjs's pending list is now empty, keeping the mechanism, so a dangling type fails the build again. The surface gains six lines (each name in its package's section and the umbrella's where it applies); the handbook's API map and the thread protocol table list them. Checked by the orchestrator on main f43b8b96af (replay 01a90ab9db of 1cc6e08d75, patch identical outside work/): typecheck, tsc -p ., work check, build with the packed checks (no pending dangling types), check:bundle, surface current, shaders:check, eslint, the handbook. npm test failed one test under load, test/noSceneGains.test.ts, which passed alone 8 of 8; test:data failed one, dish-tracks, which passed alone twice (60 of 60). Both are known load failures, and CS-966's executor found noSceneGains' cause (View.transition is not zeroed). Main has moved since, so the orchestrator replays again before merging.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the gates if main's code moved, fast-forwards, regenerates the views and logs the merge.
- B. Change the names first: Say what to change; it goes back to its executor for a round, then to the gates and to you again.
- C. Hold it: Nothing merges; alpha.1 waits on it.

Recommended: Merge it. It does exactly what you committed, with doc comments, and every gate passes apart from two known load failures that pass alone.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
