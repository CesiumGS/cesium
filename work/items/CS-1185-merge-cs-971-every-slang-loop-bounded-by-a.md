---
id: CS-1185
title: Merge CS-971, every Slang loop bounded by a constant
kind: decision
state: planned
created: 2026-11-23
project: CS-8
decider: owner
---

## Question

Merge CS-971 into main, decided on parity and the code as you said, without a GPU-time measurement?

CS-971 enforces AGENTS.md's GPU-safety rule, which protects every app on the machine. Every loop in the engine's Slang shaders is bounded by a constant with an early break: the review's ten plus seventeen more, 27 in all. Buffer indices that content reaches are clamped in every loop (`bounds.slang`'s `clampIndex` and `clampSpan`), and a test fails on any loop whose bound isn't a constant, shown by a planted loop. The Lab's parity suites, base against the change: 136 rows each with no errors and no pixel moved, one timing-text difference, tracks 8 of 8 in all six runs on rerun. Reviews: an Opus GPU-safety review found indices from data unclamped (Important), fixed; the fix's Opus review found nothing Important and that the guards don't change valid results. The GPU-time measurement couldn't decide it: the quick tier records no GPU time, and Dyno's verdict can't pair two builds of 2.0 yet (CS-1183); settle time showed no clear change. 129 index sites outside loops aren't clamped; that's a proposed follow-up. No owner paths. Checked by the orchestrator on the replay 05a4edca8a onto main 9d21b15151 (patch identical outside work/): typecheck, tsc, surface, shaders, eslint (on its changed files after one crash under load), the work check, and the related tests (dish-tracks failed once under load and passed alone, 60 of 60). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`, regenerates the views and logs the merge.
- B. B. Hold it: Nothing merges until a GPU-time comparison can be made (after CS-1179 and CS-1183).

Recommended: A. Merge it. Parity shows no pixel moved, both reviews are settled, and every shader loop now has a constant bound, which protects the shared GPU.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
