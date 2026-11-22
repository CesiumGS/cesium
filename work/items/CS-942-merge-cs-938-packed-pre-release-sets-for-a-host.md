---
id: CS-942
title: Merge CS-938, packed pre-release sets for a host application
kind: decision
state: planned
created: 2026-11-22
project: CS-609
decider: owner
---

## Question

Merge CS-938, `node scripts/packSet.mjs`, which packs every 2.0 package at a clean, named commit into `~/.cesium-bench/packs/<commit>/` with a manifest a host application installs by file: path, into main? The owner committed it, a host integration waits on it, and it touches no owner path.

The command refuses a dirty tree (staged, unstaged and untracked, checked before the build and again after packing), runs `npm run build` with the packed checks, packs each package as a release would (gitHead set to the commit), and writes the tarballs and manifest.json (commit, date, Node and npm versions, each package's name, version, tarball, sha512 integrity and size, and an `install` fragment of `dependencies` and `overrides` by ``file:./cesium-packs/<tarball>``). `--verify` reports a mixed or incomplete set; `--force` replaces a set atomically, manifest last. The overrides matter: the packages depend on each other by exact version, and `@cesium/core` is also 1.x's public package name. A review found the first test couldn't prove the overrides work (every package was a root dependency); the fix round (a95fa06ab9) installs the umbrella alone and @cesium/measure alone with only the overrides, against an `@cesium` scope pointed at an unreachable registry and `--offline`, asserts every @cesium lockfile entry is a file: tarball with the manifest's integrity, and adds a control that fails without the overrides. It also checks every @cesium/* dependency is in the set at its exact version, guards `--out` with realpath, and the host doc says overrides are mandatory and a leftover lockfile can hide a missing one. It found and fixed a real bug: @cesium/measure couldn't be imported in plain Node, because geographiclib-geodesic is CommonJS without named exports (packages/measure/src/surface.ts). The docs are docs/hosts/packed-builds.md and name no host. Checked by the orchestrator on main cd072c7cee (replay 087bfb4810 of a95fa06ab9, patch identical outside work/): typecheck, tsc -p ., work check, build, npm test exit 0 (406 files, 6,809 tests), check:bundle, surface, eslint; the command into a temporary folder and --verify: whole. test:data failed once on dish-tracks (framesExplorerScenarios) at load 60 to 72, a known load failure, and passed alone twice (60 of 60).

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; a set can then be made at main's tip for the host.
- B. Hold it: Nothing merges; the host integration keeps waiting.

Recommended: Merge it. Every gate passes on main's tip, the review's Important findings are fixed with a control test that fails without the overrides, it touches no owner path, and a host waits on it.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
