---
id: CS-929
title: Merge CS-392, finding runs from the terminal (runs, show, pin)
kind: decision
state: done
created: 2026-11-22
project: CS-389
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge."
answered_at: 2026-11-22T16:07:04.435Z
answered_via: main-session
answered_by: owner
---

## Question

Merge CS-392, Dyno's `runs`, `show` and `pin` commands, into main? It meets the overnight safe-merge bar: no owner path, no dependency, nothing drawn differently, two-way reversible.

CS-392 adds `dyno runs` (list and filter the results store, with --since and --until), `dyno show` (a run's identity and verdict) and `dyno pin` (keep a run from retention, with a reason), in bench/suite/commands/. A Claude review found one Important problem: a corrupt pins.json read as 'no pins', so the next pin erased every pin and retention (CS-736) would prune pinned runs. The fix round (e736ddb595) makes a file that exists but can't be parsed an error in `pin` and `pinnedRuns`, with a warning in `runs` and `show` so the list still shows; a missing file is still no pins; a mutation back to swallowing the error fails three tests. It also re-reads pins.json just before writing (a comment notes two concurrent pins can still race), gives `show` and `pin` one exit code for an unknown id, parses a zoneless ISO time as UTC and refuses an empty --since or --until, and fixes the --json shapes in the tests. The orchestrator read the fix. Checked by the orchestrator on main d315ddeb92 (replay 9b0522df0e of e736ddb595, patch identical outside work/, after npm ci for CS-612's lockfile): typecheck, tsc -p ., work check, surface unchanged, npm run build, npm test exit 0 (402 files, 6,740 tests), test:data exit 0. Earlier full runs on an older base failed only test/noSceneGains.test.ts under load, which passed alone 8 of 8.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge.
- B. Hold it: Nothing merges; the branch waits for the owner's review.

Recommended: Merge it. Every gate passes on main's tip with a clean full run, the Important finding is fixed and shown by mutation, and it touches only Dyno's commands and their tests.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

The chief of staff answered A on 2026-11-22 under the owner's overnight approval of safe merges. Every gate passes on the replay, and the review's one Important finding is fixed: the orchestrator read the fix and checked it with a mutation. The chief of staff checked that the diff touches no owner path.
