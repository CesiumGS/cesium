---
id: CS-886
title: "Merge CS-610, the 2.0 repository's design: layout, build, tests and releases"
kind: decision
state: planned
created: 2026-11-21
project: CS-609
decider: owner
---

## Question

Merge CS-610, the design note for the 2.0 repository's final layout, build, tests and release pipeline (docs/design/repository-build-and-release.md), into main? It is docs only. Merging doesn't answer its seven owner decisions (D1 to D7), including D1, which reorders CS-611 before CS-835; the main session files those as their own items.

The note sets the final layout once 1.x is gone, with CS-834's packages at the repository root and no packages/next; CS-835's move straight into it; parity and Dyno's baselines against a pinned, published 1.x (the npm alias cesium-1x = npm:cesium@1.147.0) in place of CESIUM_BUILD_DIR, the in-tree imports and cesium1x.ts, checked by an npm pack dry run and a read of the published cesium 1.147.0 (Build/CesiumUnminified, Source/Cesium.d.ts and the engine's Source/ are published; Build/Unminified/index.js and Specs/Data are not); Sandcastle kept, moving once to apps/sandcastle; the build, CI/CD and the alpha.1 publish, compared with current practice and with what each choice replaces; and lockfiles and reproducible installs (npm ci --ignore-scripts once 1.x leaves, which also removes today's worktree setup that runs gulp prepare and three 1.x builds). Its calls (reversible): a private @cesium/source export condition for dev and tests; the workspace root becomes the private cesium-workspace, freeing cesium for the umbrella; the Specs/Data files 2.0 uses move into test/fixtures/1x/ in CS-611; per-file declarations, no type rollup; no Turborepo, Nx or pnpm for alpha.1; CI on Node 24 and the current release. Its decisions, each recommended: D1, run CS-611 (1.x leaves) before CS-835 (the move), since the final packages/core collides with 1.x's packages/core (so CS-835 needs CS-611 and CS-611 drops CS-835); D2, the release tool is a repository script driven by `releases/<version>.md`, or Changesets, or release-please; D3, npm trusted publishing from release.yml in an owner-approved GitHub environment, staged publishes with 2FA approval, 2.0's trusted publisher beside 1.x's on cesium and @cesium/core, and a first manual publish where staging can't; D4, from 2.0.0, 1.x's releases of cesium and @cesium/core publish with --tag 1x, which changes 1.x's release task on main; D5, a one-way door: the paired 0.x experimental version is 0.(100 x major + minor).patch with the same prerelease suffix; D6, publint and @arethetypeswrong/cli as exact-pinned dev dependencies; D7, no GPU in CI for alpha.1, with Dyno run IDs as the evidence, or a self-hosted GPU runner for branch pushes. Follow-ups it proposes: isolatedDeclarations (needs CS-612), docs and site deploys for 2.0 (needs CS-613), and a software-WebGPU smoke job (needs CS-613 and D7). Checked by the orchestrator on main 7691e1092f (replay be1f48a673 of 0f722955cc, patch identical outside work/): markdownlint with the root config 0, prettier clean, hitld work check 883 files, staleNames 0, its links resolve, and the added text names no secret. Minor: it adds no index line to CESIUM2_WEBGPU_PLAN.md, which the main session can add.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. The main session files D1 to D7 and the follow-ups; CS-835 and CS-611 wait on D1.
- B. Hold it: Nothing merges; CS-835, CS-611, CS-612 and CS-613 read the design from its branch, and the move stays held.

Recommended: Merge it. Docs only, every check passes, it meets each of the owner's bullets, and its open questions, the reorder among them, go to the owner as their own items.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
