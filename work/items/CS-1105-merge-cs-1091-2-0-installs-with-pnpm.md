---
id: CS-1105
title: Merge CS-1091, 2.0 installs with pnpm
kind: decision
state: planned
created: 2026-11-23
project: CS-609
decider: owner
---

## Question

Merge CS-1091 into main? It moves 2.0's installs from npm to pnpm, as your CS-1090 A answered: pnpm-lock.yaml replaces package-lock.json, pnpm 11.12.0 is pinned by hash through corepack, and worktree setup, CI, Dependabot and the docs use pnpm, while packing and staging stay npm pack and npm stage publish. It changes owner paths: the root package.json, .human-in-the-lead/policy.json's worktree_setup, .github/, .husky/'s messages, AGENTS.md outside the contract block, and .claude/skills/dyno.

The first step was your condition: with @cesium/dyno declared at the root, the full suites passed under pnpm before anything else changed. The lockfile resolves exactly the old lockfile's versions (none added or changed), every registry package with sha512 integrity, and hitld's Git tarball with its integrity recorded; playwright, sharp and onnxruntime-web are declared where they're used. Install scripts stay off everywhere (--ignore-scripts, and allowBuilds set false for exactly the three packages that have them). CI's pnpm setup action is pinned to v6.1.1's commit; job permissions are unchanged, and the publish job installs and runs nothing new. The packed-set test now packs its third-party dependencies from pnpm's verified install, so it no longer needs npm's cache, which a fresh CI runner wouldn't have. A stray package-lock.json is ignored; pnpm run doesn't install on its own, as npm run never did. A fresh clone installs, builds and tests with pnpm, and a second worktree installs from the shared store in about 3.6 s and about 19 MiB, where npm took about 7.7 s and 1.1 GiB. Two Claude reviews (Opus): the first found the packed-set test would fail on a fresh CI runner, fixed; the second found nothing Important, and its Minors go to a follow-up. Not run: CI itself, since nothing may push. After the merge, the owner's unpushed main-files branch needs Dependabot's pnpm entry for it to act on GitHub's main, and the orchestrator switches its own scripts' installs to pnpm. Checked by the orchestrator on the replay 03320d5bad (patch identical outside work/), installed with pnpm: build, npm test 7,007 of 7,007, test:data, checkBundle, surface, shaders, eslint, the handbook, and the packed-set test with an empty offline npm cache (26 of 26).

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; worktrees then install with pnpm.
- B. Hold it: Nothing merges; 2.0 keeps installing with npm.

Recommended: Merge it. It does what CS-1090 asked, the lockfile changes no version, install scripts stay off, the release path is unchanged, and every gate passes.

If unanswered by 2026-11-26T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
