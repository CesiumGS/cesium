---
id: CS-1181
title: Merge CS-913, the USD subset reader's composition faults
kind: decision
state: planned
created: 2026-11-23
project: CS-191
decider: owner
---

## Question

Merge CS-913 into main? It makes the USD subset reader finish every input, however hostile, within a stated time and memory ceiling, and report what it refused.

USD files are untrusted input. After your CS-1097 A (one work budget, a byte cap, linear scans, an invariant over generated hostile files) and CS-1153 A (charge by bytes), every allocation is charged to one budget before it happens: 16 bytes or about 50 ns a unit, with a stated ceiling of 4 s and 256 MiB in one constant beside the code and in docs/design/usd-readers.md. The invariant review's six inputs that escaped before (a 60 MiB unterminated string peaked at 1.93 GiB; 79 million int64 values kept 603 MiB) now each finish in milliseconds at 3 MiB of heap or less. 300 seeded hostile files across 34 shapes stay within the ceiling, and four mutations (no charge per crate spec, per package entry, per token, or for kept labels) each break it. The six sample assets compose with identical facts, prims and errors. Reviews: an Opus security review, a structural round, and one invariant review; this closing round answered it. No owner paths (spikes/usd-subset, spikes/usd-readers, tests and the design note). Checked by the orchestrator on the replay 4d430f7d23 onto main 1ced9b488a (patch identical outside work/): typecheck, tsc, surface, shaders, eslint, the work check and the 54 related tests pass. Under your batch rule, the full suite runs once on the batch before any merge. After it merges, CS-914 (OpenUSD in WebAssembly as a test oracle) can start.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`, regenerates the views and logs the merge.
- B. B. Hold it: Nothing merges; CS-914 keeps waiting.

Recommended: A. Merge it. Every input the reviews found now finishes within the stated ceiling, the generated invariant and its mutations hold, and the samples compose unchanged.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
