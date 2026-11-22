---
id: CS-947
title: Merge CS-919, dyno lab --commit serves the commit's own packages
kind: decision
state: planned
created: 2026-11-22
project: CS-199
decider: owner
---

## Question

Merge CS-919, which makes a dyno lab --commit snapshot run the commit's own packages and write nothing into the worktree, into main? The owner committed it to start next, since merge evidence depends on it. It touches one owner path, the dyno skill, which the item's work needs.

Before, a .bench/ snapshot resolved `@cesium/*` through the worktree's node_modules, so the commit side ran the worktree's code; slangBuild also compiled .slang files inside snapshots. Now each snapshot links its own workspace packages (state in node_modules/.bench-deps.json), installs its own dependencies with npm ci --ignore-scripts when the lockfiles differ, and slangBuild compiles only the engine's src/ and examples/; vite's dev server ignores its own .bench/; dyno lab takes --port. A planted difference (a console.warn reached only through `@cesium/next/ui`) shows with --commit and didn't before. The executor found that most parity pages import packages/core by relative path, so only pages that import through `@cesium/*` names were affected. A Claude review found two Important problems: switching a snapshot from links to an install could let npm ci write through a nested link into the worktree's node_modules, and switching back threw; the fix round (a3237d062b) removes the snapshot's own links before any install, refuses while a link points outside it, keeps an installed snapshot installed, refuses unsupported workspace patterns and a linked node_modules; a mutation without the link removal rewrites a worktree package from 2.0.0 to 3.0.0 in the test. The orchestrator read the unlink code: symlinks only, inside the snapshot. The dyno skill (.claude/skills/dyno/SKILL.md) now describes --commit truthfully, says comparisons before CS-919 were vacuous where they imported `@cesium/*`, and fixes one 'per frame' to 'per tick'. The audit of --commit comparisons since the move is in the item's body. Checked by the orchestrator on main 1f52eb9630 (replay ad487ce5ff of a3237d062b, patch identical outside work/): typecheck, tsc -p ., work check, build, npm test exit 0 (406 files, 6,800 tests), check:bundle, surface, shaders:check, eslint. test:data failed once on dish-tracks under load (50 to 59) and passed alone twice (60 of 60), the known load failure.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check, regenerates the views and logs the merge; --commit comparisons become valid evidence again.
- B. Hold it: Nothing merges; comparisons keep using a separate checkout and server per side.

Recommended: Merge it. Every gate passes on main's tip, the review's Important findings are fixed and shown by mutation, and it restores --commit as merge evidence, which the owner wanted next.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
