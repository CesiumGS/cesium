---
id: CS-916
title: Merge CS-835, 2.0's folders become its packages in the final layout
kind: decision
state: planned
created: 2026-11-22
project: CS-615
decider: owner
---

## Question

Merge CS-835, which moves CesiumJS 2.0 out of packages/next into its final layout (packages/core, time, frames, crs, measure, ui and the umbrella packages/cesium, still named @cesium/next; apps/sandcastle; tools/dyno; the harness, work/ and docs at the root) and makes the import-boundary test read the layer rule from each package's package.json, into main (the 2.0 branch)? The owner approved it: 'you can merge the package move too, and the rest of the work to get 2.0 onto a clean tree that's part of that move. you have my permission.' It touches owner paths.

30 commits: the design's eleven steps (docs/design/repository-build-and-release.md, 'CS-835: the move, commit by commit') and a fix round. Pure moves by git mv with specifiers rewritten by script (4,379 moves in step 2 alone), compared by a script with strings set aside; the non-pure commits are named, each its own: scaffolding, root dependencies, path strings, owner paths, package names (@cesium/core, @cesium/core/internal, @cesium/frames/internal and @cesium/crs/internal for names siblings take that aren't published, as CS-883 gave core), the @cesium/source condition, the umbrella's exports and library build, the boundary test, the handbook and docs, and fixes the suite and two reviews found. Every commit type-checks, each re-checked in a fresh clone. api/surface.txt changes only by the two entry renames the map names (proj to crs, widgets to ui; 886 lines before and after). The lockfile changes only by workspace links (810 of 811 entries keep version, integrity and resolved; 1.x's @cesium/core 0.1.1 now nests under cesium-1x and its packages). The dependency graph: core, then time, then frames, then crs and measure, then ui, the umbrella over all six; no cycle, no capability package depends on an adapter, all private. The boundary test reads `packages/*/package.json`, requires all six packages and the umbrella to be present, and refuses a planted bad edge of each of 9 kinds. Owner-path changes: .human-in-the-lead/tracker.json work_dir to work; policy.json's gates run at the root, its owner paths re-pointed (api/surface.txt, packages/core/src/index.ts, packages/core/src/ir/FORMAT.md, packages/cesium/package.json), packages/next/AGENTS.md and packages/next/.claude/ kept as stale-but-harmless entries, inline_globs to `work/**`, nothing widened; .husky hooks drop packages/next's .bin from PATH; AGENTS.md takes packages/next/AGENTS.md's text, its contract block intact; the skills move to the root's .claude/skills; the root package.json takes the workspaces `packages/*`, `apps/*` and `tools/*` and the scripts. The executor's parity: the 11 Lab suites, previous commit and base against the tip, identical with timings aside but imagery's FLIP noise (results 2026-11-22T12-16-47-392Z, 12-20-38-220Z and 12-24-31-826Z); lod fails identically before and after until CS-911. Two Claude reviews: the first found three Important problems (scripts still reading or writing the old root src/ paths: leapTable, erfaTables, corridorGround, corridorDaylight), fixed in a round that also fixed Dyno's catalog areas, the Lab's allocation gate and the handbook's seam notes, and added test/repoPaths.test.ts, which fails on the old paths; the second found nothing Important. The two erfa folders are the package map's split (time keeps its TDB files, frames the rest), not a stray copy. Checked by the orchestrator on main 0a138e93e8 (replay ac297e6251 of 08952ce2f6, patch identical outside work/; CS-913's and CS-914's items placed in the moved work/): a clean npm ci from the lockfile; both type checks; work check 912 files; surface unchanged; eslint clean; npm test exit 0 (398 files, 6,644 tests); test:data exit 0 (56 files); shaders:check, check:bundle, the handbook and Sandcastle build. build:lib exits 1 at its declaration check: Route, RouteStep (named by measure's drawnDistance) and Recordable (named by Inspectable) aren't exported by an entry; build:lib already failed at the base, at an earlier step, and exporting them is a public-name change for the owner or CS-102. Minors: the path guard has no 'found any' assertion; non-literal joins aren't checked; the Lab's allocation gate now counts packages/ui/src as engine code; some comments and stale owner-path entries. After the merge, on the owner's machine: the main checkout's packages/next/.env.local moves to the root, its local launch.json entries need the root scripts, its node_modules needs npm ci (already needed since CS-611), and the store's design tiles read as out of date until npm run setup.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge; then CS-911 (the fix-ups), CS-612 (the new build), and the replays of CS-900 and CS-680 across the move, followed by the items held behind it.
- B. Hold it: Nothing merges; CS-911, CS-612, CS-613 and the held items keep waiting.

Recommended: Merge it. Every gate passes on main's tip, the moves are pure and named where they aren't, parity matches, two reviews end with nothing Important open, and the owner approved the move.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
