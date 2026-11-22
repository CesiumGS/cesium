---
id: CS-937
title: Merge CS-931, the handbook builds again
kind: decision
state: planned
created: 2026-11-22
project: CS-609
decider: owner
---

## Question

Merge CS-931, which makes `npm run handbook` build on a fresh checkout and fixes handbook/viewer/workerPool.ts's two type errors, into main? It's committed under the owner's approval of the clean-tree work (CS-612 and CS-613 included), on the same bar as the move, and touches no owner path.

The handbook's data step now always runs `scripts/build.mjs --no-checks` before the bundle check, so a fresh checkout builds and a stale dist/ can't give old figures; `--no-bundles` (the dev server) skips it. workerPool.ts imports TextureTranscodePath from profile/paths.ts and reads payload.textureTarget, the key the engine sends since CS-22 (the old read was also a latent run-time bug), and passes parseGltf a GltfFetch through engineFetch with the job's headers, as worker.ts's bridge does. No engine change and no public name. The cause, bisected with tsc -p handbook: CS-22 (8fec985e35, 2026-11-19) removed TextureFormatSupport; CS-809 (ae107e9387, 2026-11-21) changed parseGltf's third argument; neither touched handbook/viewer/, and nothing type-checked it outside `npm run handbook`, which no merge gate runs. The root tsconfig.json now includes handbook/viewer, so `npm run typecheck` (a merge gate) and `tsc --noEmit -p .` fail on such a break; shown by reverting the fix. The orchestrator read the diff. Checked by the orchestrator on main 7e802d2aa0 (replay 20dd1e512e of cc38d5bf58, patch identical outside work/), in a fresh worktree with no dist/ or handbook/generated: npm run handbook exit 0 (one HTML file written), typecheck, tsc -p ., work check, build, npm test exit 0 (402 files, 6,740 tests), test:data, check:bundle, surface current. CS-613's CI handbook job needs this.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the handbook keeps failing to build on main, and CS-613's CI handbook job would fail.

Recommended: Merge it. Every gate passes on main's tip, the handbook builds from a fresh checkout, the cause is found and now covered by an existing gate, and the change is small and two-way.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
