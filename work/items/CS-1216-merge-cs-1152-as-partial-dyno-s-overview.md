---
id: CS-1216
title: Merge CS-1152 as partial, Dyno's overview compares like with like
kind: decision
state: planned
created: 2026-11-24
project: CS-199
decider: owner
---

## Question

Merge CS-1152's code into main as partial? Dyno's overview stops dividing one engine's GPU timer by the other's, labels frame time for what it is, records 1.x's GPU time, and a lost device stops its scene. The item stays open for its quiet ion-scene run after CS-1127.

What it does: 1.x runs record GPU time per frame, and a GPU-paced mode measures both engines the same way, with each tick waiting for the GPU. The overview shows GPU and CPU time per frame side by side, and labels the frame interval for what it is. A first Opus review found four Importants, all closed and confirmed by a scoped re-review: (1) 2.0's GPU metric changed meaning, so it is now timer 3 and the uncapped orbit's start is versioned, and trends and change points don't flag the version change but still flag changes within a version; (2) no ratio is ever taken between two different GPU timers, in headlines, tiles, scene tables, scorecard verdicts, budgets and compare; (3) a lost GPU device stops that scene and its remaining runs, closes the browser, and the next scene starts in a fresh one; (4) motion sampling is tested, with mutations shown failing. What is not done: the last done-when, a quiet run with valid ion scenes cited by run ID, needs CS-1127 merged and a quiet machine. The run the branch cites (2026-11-24T05-01-18-090Z-mac-apple, 24 of 24 valid) ran with the quiet bar raised, so it doesn't count. The orchestrator set the item back to in-progress on the replay, so merging doesn't close it. Your CS-1173 A (skip milk-truck-fleet in the uncapped orbit) is CS-1174's, which needs this merge. Minors left: the runner test mirrors the loop in suite.mjs rather than running it, and the wiring in runScene is untested. No owner paths. Checked by the orchestrator on the replay 38c0e6daca: typecheck, tsc, surface, shaders, eslint, the work check, and the related tests (six files failed under load and passed alone: dynoWork, identity, importBoundary, noSceneGains, frameCatalog, dish-tracks). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: blast-radius. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it as partial: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The item stays in progress until a quiet ion run after CS-1127, and CS-1174 can start.
- B. B. Hold it until the ion run: Nothing merges until CS-1127 merges and a quiet run with valid ion scenes can be cited; CS-1174 waits too.

Recommended: A. Merge it as partial. The comparison is fixed now and both reviews' Importants are closed; only the confirming run waits, and that can't happen before CS-1127 merges.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it until the ion run.

## Answer

Recorded in the front matter once answered.
