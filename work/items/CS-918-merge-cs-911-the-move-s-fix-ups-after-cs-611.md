---
id: CS-918
title: Merge CS-911, the move's fix-ups after CS-611
kind: decision
state: done
created: 2026-11-22
project: CS-609
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then CS-612, the new build system, starts."
answered_at: 2026-11-22T14:02:59.059Z
answered_via: main-session
answered_by: owner
---

## Question

Merge CS-911, the fix-ups that CS-611's and CS-835's reviews found, into main? It's covered by the owner's approval of the move: 'the rest of the work to get 2.0 onto a clean tree that's part of that move'. It touches one owner path, the dyno skill's stale setup advice, which the item names.

The fix-ups: (1) the lockfile resolves human-in-the-lead over git+https instead of git+ssh, a one-line change at the same commit SHA, which is the pin since npm records no integrity hash for a git dependency; a fresh clone installs with npm ci and SSH disabled; (2) the stale advice to run a root npm run build or set CESIUM_BUILD_DIR is gone from the Lab's error text, the dyno skill, packages/cesium/README.md and the handbook's overview tab; (3) Sandcastle's six -dev examples that loaded the deleted Specs/Data are removed, since their data is in neither 2.0's tree nor the pin, picking-dev drops its two vector-tile scenarios, and apps/sandcastle/README.md says so; Sandcastle builds with 306 examples; (4) NOTICE files beside packages/core/src/io/ThirdParty/ and packages/ui/src/assets/, matching the root LICENSE.md; (5) the pinned-1.x test also catches join()/resolve() paths, path strings and templates into 1.x's tree, and dynamic import()/require() of 1.x's packages, each shown by a mutation; (6) stale references to 1.x's tree are gone from the eslint config, .prettierignore, .gitignore, .vscode/, cspell and the root README, keeping every ignore for output that still exists; (7) parity/lod.ts reads tileset.state.policy, and the lod suite passes (bench/results 2026-11-22T13-34-06-395Z); (8) added under the owner's approval through the chief of staff: test/repoPaths.test.ts, CS-835's path guard, skips a missing path that git ignores (git check-ignore, no allowlist), so the full suite passes on a fresh checkout that hasn't built the handbook, with a mutation showing a stale path still fails; (9) eslint ignores apps/sandcastle/dist/ and handbook/dist/, since CS-611 moved Sandcastle's output from Build/, which eslint already ignored, and npm run eslint after a Sandcastle build had failed on its bundles. A Claude review has no Important findings. Minors: the pinned-1.x test doesn't catch import(variable) or a bare side-effect import of cesium; arobison/human-in-the-lead may be a private repository, in which case https removes the SSH key but CI (CS-613) still needs a credential. Checked by the orchestrator on main a33bdc04ef (replay 12cbaa967e of a3198c27c4, patch identical outside work/, in a fresh merge worktree with no handbook/generated): both type checks; work check 914 files; surface unchanged; npm test exit 0 (399 files, 6,667 tests) on that fresh checkout; test:data exit 0; Sandcastle builds; the handbook builds (data step and vite build); npm run eslint exits 0 after both builds. With this merged, main's full suite passes on a fresh checkout again.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then CS-612, the new build system, starts.
- B. Hold it: Nothing merges; main's full suite keeps failing on a fresh checkout, and CS-612 waits.

Recommended: Merge it. Every gate passes on a fresh checkout of main's tip, the review has nothing Important, and it's the fix-up work the owner approved with the move.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

The chief of staff answered A on 2026-11-22 under the owner's approval in advance of the move's fix-ups: "the rest of the work to get 2.0 onto a clean tree that's part of that move". Every gate passes on the replay in a fresh worktree, the path guard included, and the review has no Important findings.
