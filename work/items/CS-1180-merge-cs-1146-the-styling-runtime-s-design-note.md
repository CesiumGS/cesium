---
id: CS-1180
title: Merge CS-1146, the styling runtime's design note
kind: decision
state: planned
created: 2026-11-23
project: CS-10
decider: owner
---

## Question

Merge CS-1146 into main? It lands `docs/design/styling-runtime.md`, the shared styling runtime's contracts from your decisions CS-1129 to CS-1143 and CS-1169, and rescopes CS-337 with short pointers in CS-258 and CS-557 to CS-559.

The note states each of your answers as given, cited by its CS-n: Rust and WebAssembly in production builds (CS-1133 amends core-ir.md decision 4 fully; whether that covers naga is listed as an open question for you), GPU-first evaluation with CPU forms for WebGL 2, a pure, total, metered IR, label collision on the GPU, units as IR types, the experimental language plus the 1.x front end, MapLibre expressions now (CS-1170) and whole style documents later (CS-1171), CSS Color 4 in and linear-light sRGB out, and an explicit missing value. It says plainly that the Rust workspace isn't started, and gives each part a status. Two Claude reviews (Opus): the first found the exclusions clean (no curve renderer, no host application, nothing about who embeds the engine or why) but two Important problems, CS-1133 narrowed and the MapLibre question answered without you; the fix round settled both, and a scoped check confirmed them. Docs and item files only, no owner paths. Checked by the orchestrator on the replay 9f21ffa3af onto main 9d21b15151 (patch identical outside work/; CS-337's needs kept as main's `[CS-1146]`): typecheck, tsc, surface, shaders, eslint and the work check pass. Under your batch rule, the full suite runs once on the batch before any merge. Six follow-up proposals the note lists are for the chief of staff to file after the merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`, regenerates the views and logs the merge.
- B. B. Hold it: Nothing merges; the note stays on its branch.

Recommended: A. Merge it. It states your decisions as given, both review findings are fixed and checked, and it touches no code.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
