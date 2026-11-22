---
id: CS-910
title: Merge CS-611, 1.x leaves the 2.0 branch
kind: decision
state: done
created: 2026-11-22
project: CS-609
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then it starts CS-835's move into the final layout, headless."
answered_at: 2026-11-22T09:42:20.358Z
answered_via: main-session
answered_by: owner
---

## Question

Merge CS-611, which commits the first root lockfile, pins 1.x as cesium-1x = npm:cesium@1.147.0, switches every path into 1.x's tree to the pin, moves the Basis transcoder, the sky textures and the Specs/Data files 2.0 uses into 2.0's tree, builds Sandcastle from the pin, and then deletes 1.x's source, build and workflows from this branch, into main (the 2.0 branch)? The owner approved merging CS-611 when it's ready: 'i give you permission to merge 611 when it's ready to unblock more work'. It touches owner paths (package.json, .github/, .human-in-the-lead/policy.json).

Owner-path changes: the root package.json becomes the private cesium-workspace, with cesium-1x added, devDependencies trimmed to eslint and its plugins, prettier, markdownlint-cli, husky, typescript and esbuild, and workspaces sandcastle, next and dyno; .human-in-the-lead/policy.json's worktree_setup becomes npm ci --ignore-scripts --no-audit --no-fund --prefer-offline; .github/ loses only 1.x's workflows (deploy, dev, prod, sandcastle-dev, update-tokens) and two actions, keeping cla.yml, cla-rotation-reminder.yml, dependabot.yml and check-for-CLA. The deleted workflows named these secrets, names only: DEV_AMPLITUDE_API_KEY, DEV_AWS_ACCESS_KEY_ID, DEV_AWS_SECRET_ACCESS_KEY, PROD_AMPLITUDE_API_KEY, PROD_AWS_ACCESS_KEY_ID, PROD_AWS_SECRET_ACCESS_KEY, ION_TOKEN_CONTROLLER_TOKEN, ITWIN_SERVICE_APP_CLIENT_ID, ITWIN_SERVICE_APP_CLIENT_SECRET, GITHUB_TOKEN. .husky/, lint-staged and packages/next/package.json are unchanged; .npmrc is deleted. The lockfile: seeded from the installed versions, 0 versions moved, every registry entry from registry.npmjs.org with an integrity hash; it adds only cesium-1x and its own @cesium/core 0.1.1, gltf 0.1.1, engine 26.5.0 and widgets 16.3.1. The switch check: a Dyno study (work/studies/2026-11-22-pinned-1x-switch.md; suite run 2026-11-22T08-28-45-711Z-mac-apple at load about 19, flagged invalid as busy) and Lab parity, base (in-tree 1.x) against the pin, identical but imagery (10^-5 FLIP, within the noise between two pin runs), one 2.0-only customShader row that failed at base and passes after, and lod, which fails identically before and after (a pre-existing bug, below). No new binaries: all 220 moved files are exact renames, and the Basis transcoder and the sky textures are 1.x's own files; the root LICENSE.md still carries their notices (basis_universal under Apache 2.0, the NASA sky box, the moon map). No secret in the diff. Checked by the orchestrator on main 9ab10f3ddf (replay 88d7fba38b of 1293423b30, patch identical outside work/): a clean npm ci --ignore-scripts from the lockfile exits 0; both type checks; work check 907 files; surface unchanged; npm test exit 0 (397 files, 6,642 tests); test:data exit 0 (56 files); shaders:check 0; check:bundle 0; the handbook builds; Sandcastle builds; the Lab's parity, models, tileset, selection, globe, imagery, customShader, translucency, heights, tracks and baseline suites run (exit 0) and match CS-611's final runs with timings aside, but imagery's 10^-5 FLIP noise; the two console errors (a deliberate broken-shader case, and the intermittent getMappedRange readback) were in the base runs too. A fresh Claude review has no Important findings. Its Minors, for a fix-up item under the owner's approval of the move: the lockfile resolves human-in-the-lead over git+ssh with no integrity hash, so npm ci needs a GitHub SSH key (the other machine and CI); the README, the Lab's error text and the dyno skill still advise a root npm run build or CESIUM_BUILD_DIR; six Sandcastle -dev examples load the deleted Specs/Data; no notice sits beside the moved third-party files (the root LICENSE.md covers them); the pinned-1.x test misses join() paths and dynamic imports; stale eslint, prettier, gitignore, editor and README references. Executor's follow-ups: parity/lod.ts reads tileset.policy (now tileset.state.policy); dyno lab hangs after a suite throws (keepAwake not released); studies compare the raw --baseline spec with the resolved id; dyno suite run has no port option. Its question: Snyk folder trust, so the dependency scan can run (npm audit stood in: 15 advisories, all dev tooling, against 22 before).

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then it starts CS-835's move into the final layout, headless.
- B. Hold it: Nothing merges; CS-835, CS-612, CS-613 and the eight items held behind the move keep waiting.

Recommended: Merge it. Every gate passes on main's tip, including a clean install from the new lockfile and the parity suites, the review has nothing Important, and the owner approved merging it when ready.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

The chief of staff answered A on 2026-11-22 under the owner's approval in advance: "i give you permission to merge 611 when it's ready to unblock more work". Ready meant that every gate passes on the replay and a fresh review has no open Important findings. The evidence above shows both.
