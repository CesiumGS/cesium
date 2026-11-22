---
id: CS-917
title: Merge CS-900, three USD readers compared in Dyno
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge. CS-901's evidence is in the tree."
answered_at: 2026-11-22T13:39:02.752Z
answered_via: main-session
answered_by: owner
---

## Question

Merge CS-900, a Dyno instrument that compares three USD readers (the subset reader, LightUSD 1.0.0 and OpenUSD 26.11.1, the last two built outside the repository) over six SimReady samples, and its design note docs/design/usd-readers.md, into main? It meets the overnight bar for a safe merge, with one failure that's main's own: the move's path guard fails on any fresh checkout until CS-911 lands.

Results (run 2026-11-22T10-56-32-200Z-apple-metal-3): Brotli sizes 9,152 B (subset), 817,081 B (LightUSD) and 1,718,550 B (OpenUSD); median start, new Worker to a composed stage, 15 to 28 ms, 42 to 70 ms and 138 to 153 ms (OpenUSD's includes copying the layers into its in-memory file system, which the note says); coverage over the 82 checks where OpenUSD found something: subset 79, LightUSD 67, OpenUSD the reference, with every miss on the one sample that lacks two referenced layers; what a page must allow: nothing, wasm-unsafe-eval, and COOP, COEP and wasm-unsafe-eval. The builds sit in the setup store from tagged sources with checksums; nothing prebuilt runs, and nothing built is committed. The recommendation for CS-901 is A: keep the subset reader, fix its two composition faults, and use OpenUSD in WebAssembly as a test oracle, not shipped. Reviews: the first found nothing Important; its Minors (vacuous agreement in coverage, no reference, per-run outcomes, a null message, OpenUSD's copy time) were fixed in a round whose own review found nothing Important (Minors: the '(agree trivially)' label when empty-check agreement is under 100%, and no test of a reference of 0 against a nonzero reading). The branch was then replayed across CS-611 and CS-835 by its executor: one conflict in bench/suite/commands/lab.mjs, resolved by keeping main's pinned-1.x logic and paths and adding the usdReaders entry and run_id; the new files moved to bench/, spikes/usd-readers/ and test/; the review confirmed no other Lab suite changes. It touches no owner path, adds no dependency, secret or data, doesn't change rendering, and is two-way reversible. Checked by the orchestrator on main bd86097df3 (replay 52a6499221 of 6bc122032a, patch identical outside work/, fresh npm ci): both type checks, eslint, work check 913 files, surface unchanged, test:data exit 0 (56 files), npm test 398 of 399 files with one failure: test/repoPaths.test.ts names the generated, gitignored handbook/generated/reference.json; the same test fails identically on main's tip in the same clean worktree, it is CS-835's guard, and CS-911 fixes it under the owner's approval of the move.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), runs the work check on main, regenerates the views and logs the merge. CS-901's evidence is in the tree.
- B. Hold it: Nothing merges until CS-911 lands and the suite passes on a fresh checkout.

Recommended: Merge it. Every gate passes but one test that fails the same way on main, two reviews end with nothing Important open, and it touches no owner path.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.

The chief of staff answered A on 2026-11-22 under the owner's overnight approval of safe merges. The only failing test, `test/repoPaths.test.ts`, fails the same way on main's tip in a clean worktree (a fix-up of the move, now in CS-911). Everything else passes, the reviews have nothing Important open, and the chief of staff checked that the diff touches no owner path.
