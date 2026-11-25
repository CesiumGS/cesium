---
id: CS-1353
title: Merge CS-258, the vector drawing design and its plan
kind: decision
state: done
created: 2026-11-25
project: CS-190
decider: owner
answer: "A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh. CS-261 and CS-654 can then build from it on main."
answered_at: 2026-11-25T15:38:07.186Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-258 into main? It lands the design for one line-and-point path shared by vector layers, CAD display styles and B-rep edges (docs/design/vector-drawing.md), its plan (docs/superpowers/plans/2026-11-24-vector-drawing.md), and the handbook's vector tab at status sketch. No engine code.

The design records your answers as given: Q1 B (draped vectors wait for CS-654's mechanism; meanwhile CS-261 draws no clamped stroke or fill and reports each layer once), Q2 (no labels until the styling runtime, whose beginnings join this work), Q3 A (earcut), Q4 asked as 'Is collision one of those beginnings?' and answered 'a runtime GPU kernel' (the runtime's IR compute kernel, CS-1131), Q5 A (3D Tiles vector content split out as CS-1331, needing CS-261 and CS-554), edges take the depth offset too (the CAD note quoted as written, your answer as its extension), the overlay slot runs after tone mapping, and the patent sentence is gone. Your later answers are recorded too: Q6, the Rust workspace lives at cesium-runtime/ in this repository's root for now and moves out later to its own repository, cesium-runtime, self-contained, with CI gaining a Rust toolchain and a WebAssembly build step in CS-1324; Q7, an OFL font and a permissive Rust shaping crate, each checked before it's added. The plan names its items by ID (CS-1324 to CS-1337, filed as proposals; CS-1324 and CS-1334 since planned by you), and follows the release change: CS-557 (MVT) needs CS-1334, not CS-259, and the runtime items other than CS-1324 stay off alpha.1's path. CS-558 needs CS-261 and CS-1334 instead of CS-557 (the chief of staff's call, reversible). An outside Opus check found 5 Importants (a join formula, float32 precision claimed past a record's size, a false claim about composite.ts, the depth-offset rule widened by paraphrase, plan needs that disagreed); all are fixed, and the executor's own Opus review of the rework ran two rounds and fixed what it found. Docs and the handbook's vector tab only; no owner paths. Checked by the orchestrator on the replay 16d0e4b730 (changed lines identical to the branch's). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with merge-item.sh. CS-261 and CS-654 can then build from it on main.
- B. B. Hold it: Nothing merges; CS-261 and the vector items have no design on main, and CS-654 stays stacked on CS-258's branch.

Recommended: A. Merge it. It meets the done-when, records every answer as given, and both reviews' findings are fixed.

If unanswered by 2026-11-27T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
