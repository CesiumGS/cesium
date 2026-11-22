---
id: CS-884
title: "Merge CS-404, studies: the model, the files and the commands"
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-404, Dyno's studies (the study file format in packages/next/work/studies/, its validator, the study and studies commands, run --study, retention of cited runs, the statistics behind a computed verdict, and the dev server's read and validated write endpoints), into main, after a small fix round that limits the endpoint's branch parameter to real local branches?

Every done-when is tested: a study made, run against, noted and concluded from the CLI reads back with its evidence and diffs by line; citing an invalid run warns; a run with --hypothesis and no study is refused (exit 2), naming study new, and writes no file; a study on another local branch lists with its branch, read-only; the endpoint rejects malformed (400), oversized (413), cross-origin or missing-header (403), wrong content type (415) and traversal ids (400), and writes nothing outside work/studies/; a cited run survives retention; studies --item --json keeps a fixed key set; a comparison missing a primary metric, minimum effect, guardrail margins or sample plan is refused before any run counts; verdicts are computed from pre-stated criteria (a failed guardrail gives refuted, missing instrument runs give inconclusive); runs failing the health bar (battery, load) are excluded and named; the power analysis matches a known case (34 runs for half a standard deviation); the sequential option keeps the false-positive rate at or under 0.05 over 2,000 simulated A/A runs (fixed seed); the Bayesian readout matches the conjugate closed form and is calibrated; the hierarchical model flags exactly a planted scene. Beyond the item's file list: new studyStats.mjs, studyVerdict.mjs, instruments.mjs and studiesEndpoint.mjs; telemetry.mjs records the machine's state (power, battery, load, thermal) in every run; repeatable CLI options. Security: the write endpoint requires an X-Dyno-Study header, checks sec-fetch-site, origin and host, restricts ids to [0-9a-z-], caps sizes, and keeps exception text out of responses; Snyk's remaining two flags are false positives. The fix round (a Minor the chief of staff found on review): the GET endpoint's ?branch= value is checked only against a character pattern, so a value starting with '-' reaches git ls-tree through execFile (no shell) and git reads it as an option. It's read-only on a localhost dev server, so the risk is low; the fix accepts only branches in localBranches(root), refuses others before git, and adds tests. Checked by the orchestrator on main 04ea295384 (replay 85fc1bd11e of 12dfcb069a, patch identical outside work/): both type checks, work check 880 files, surface unchanged, npm test exit 0 (387 files, 6,520 tests), test:data exit 0 (56 files). It touches no owner path.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge after the fix round: The executor limits ?branch= to local branches with tests; the orchestrator replays the branch onto main's tip, reruns the type checks, the Dyno tests and the work check, fast-forwards main, regenerates the views and logs the merge. CS-405, CS-402 and CS-736 can then build on it.
- B. Merge now; the fix as a follow-up: The orchestrator merges the checked replay as it is, and the main session files the branch hardening as a small item.
- C. Hold it: Nothing merges; CS-405 (the Studies page), CS-396 and CS-402 wait, and the branch needs a replay across CS-835's move later.

Recommended: Merge after the fix round. Every gate passes, every done-when is tested, and the one finding is a small, cheap fix that's better in before the endpoint merges than after.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
