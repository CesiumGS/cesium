---
id: CS-803
title: Merge CS-394, example scenes and the development metrics
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-394, which lets Dyno measure the examples as group D scenes (catalog dev.json, example.html in the frozen build, the host pose contract and declared example parameters), records the development metrics of the harness plan's section 4, adds the settle rule with 'not settled', and puts 'Measure this' in the Examples view, while keeping group D out of Overview, headline means, scorecards and budgets, into main?

vex-x10-zermatt ran from the frozen build (run 2026-11-22T02-11-28-557Z-mac-apple, 2 reps), settled and valid, with every metric in section 4's table: tiles and requests per tileset, requests and bytes by host class, triangles and draws, GPU time for 14 passes, probe=sse (stretched error), page errors, settled and the request rate at the end. A capped run (2026-11-22T02-02-45-433Z-mac-apple, --settle-cap 4) reports 'not settled' with the reason and a validity warning, not failed. param.x sweeps reach the example (2026-11-22T02-03-34-479Z-mac-apple: about 208,000 against 325,000 triangles), and out-of-range or misplaced params are refused. Group D is kept apart in catalog.exampleScenes, so default runs, Overview, scorecards and budgets are unchanged (tested). The ion token: none of the six runs' records or summaries holds a token; the frozen build's only token is CesiumJS's public evaluation token, as before; the page reads Dyno's token setting, as the Examples view does. Tileset labels go through the example host contract, since the public API has no tileset label. New run options: --settle-cap, --probe sse and --gpu-ticks. The settle rule doesn't use CS-136's converged() yet, which isn't built. Its worktree had no hooks path set, so lint-staged and hitld's commit guard didn't run on its commits; at the merge check I ran the commit guard (no file above the public ceiling, no private term), prettier, markdownlint with the root config and eslint on its 25 files: all clean, and its diff adds no token-shaped string or absolute path. Outside its file list: the settings registry's param. entries, commands/suite.mjs and table.mjs, examples/types.ts, views/Overview.tsx, views/examples.css, type declarations, a new exampleHost.ts and its test. Checked by hand on main 76b3aaac9b (tested 4ab9001a91): both type checks, hitld work check (800 files), surface (no API change), npm test exit 0 (380 files, 6,377 passed, no unhandled errors), test:data exit 0. Cold start isn't needed: Dyno's pages and the examples, not the engine or the viewer. Follow-ups in its hand-over: the Scenes view doesn't list group D; development metrics for catalog scenes. To try it once merged: Dyno's /#/examples/vertical-exaggeration?x=7, then 'Measure this'. Presentation: orch-11-merge-ready-CS-394.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the dyno and example tests, fast-forwards main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; Dyno can't measure the examples, and development metrics aren't recorded.

Recommended: Merge it. Every gate passes, the example ran from the frozen build with every metric, no token reaches a record, and the hooks' checks that didn't run on its commits are clean at the merge.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
