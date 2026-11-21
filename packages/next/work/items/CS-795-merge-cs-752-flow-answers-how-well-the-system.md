---
id: CS-795
title: Merge CS-752, Flow answers how well the system and the owner work together
kind: decision
state: planned
created: 2026-11-21
project: CS-389
decider: owner
---

## Question

Merge CS-752, which replaces the Flow tab on Dyno's Work page with a view of cost, throughput, latencies, quality, the owner and the system, and the machine, each metric with a trend over runs, a band where policy sets one and one line on what to do when it's out of band, plus a shareable text summary, into main?

Cost: tokens per merged item and its coverage (307k median today, known for only 6 of 50 merged items), rework, and spend against appetite; money not yet. Throughput: merged per run, clauses done, work in progress against the run's max_executors, and planned to claimed to done to merged, timed from the claim and close commits' author and committer dates (which works around CS-786's weak history for Flow alone). Latencies: decision time by door type and by now or digest, merge-ready to merged, set-up to started, report to verified; check run time not yet. Quality: first-pass rate, check failures split into real and passed-on-rerun, follow-ups per item, estimate accuracy, reverts. You and the system: questions per digest against your attention budget, interrupts per day, time since the last digest, recommendation taken (read from decision text), defaults applied and calls logged; worth-asking ratings, reversals and corrections not yet. The machine: lease expiries, stalls and abandons; contention and harness refusals not yet. Bands come only from policy, a run's max_executors and appetite; elsewhere it says 'No band set'. Copy as text gives titles, not bare IDs; token counts only when 'With token counts' is checked; it never carries hosts, sessions, dispatch IDs, notes, logged-call text or briefs. It reads through one new route on the board's endpoint (/work-api/flow.json), which takes nothing from the URL and runs git and hitld (hitld ledger tail, through the installed bin, not npx) with argument arrays, within the read budget (about 0.4 s cold). The cumulative flow chart stays as Flow's last card. I checked every one of the 22 CSS classes it removes from work.css: none is still used on the branch or on main. Outside its touches: the route in scripts/vitePluginWork.ts, its types in scripts/workBoard.d.mts, its DESIGN.md section and eslint.seatbelt.tsv (Work.tsx's allowance fell from 9 to 8). Checked by hand on main 71620591e1 (tested b8c85f80e0): both type checks, hitld work check (792 files), surface (no API change), npm test exit 0 (378 files, 6,202 passed, no unhandled errors), test:data exit 0. Cold start isn't needed: Dyno views only. The executor's question, for you, not part of this merge: should the board read hitld's trust record (each answer's latency and whether you took the recommendation, worth-asking ratings, reversals)? hitld rc.1 has no command the board may run for it, so that would be a new read-only hitld command, for hitld's next batch; until then Flow says which measures wait on it. To try it once merged: #/work?view=flow on Dyno; click the 'Out of band' figure; tab to a trend and use the arrows; check 'With token counts', then Copy as text; set a scope with &project=CS-389. Presentation: orch-11-merge-ready-CS-752.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks, work check and the Dyno Work tests, fast-forwards main, regenerates the views and logs the merge; CS-753 (a calmer Your move) can then start.
- B. Hold it: Nothing merges; Flow keeps today's measures, and CS-753 waits.

Recommended: Merge it. Every gate passes, no removed style is still in use, the summary holds back what it should, and it says plainly which measures can't be told yet rather than inventing bands.

If unanswered by 2026-11-23T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
