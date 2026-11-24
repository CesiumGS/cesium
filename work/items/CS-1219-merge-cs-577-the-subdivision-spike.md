---
id: CS-1219
title: Merge CS-577, the subdivision spike
kind: decision
state: planned
created: 2026-11-24
project: CS-193
decider: owner
---

## Question

Merge CS-577's spike into main? It adds spikes/subdivision/, which measures a TypeScript patch conversion against OpenSubdiv in WebAssembly on the same cages, so the subdivision decision (filed separately) has its evidence in the repository.

The spike lives in spikes/subdivision/. It has the TypeScript Catmull-Clark conversion to Bézier patches, OpenSubdiv's C++ bindings and their build script (run only by hand), a memory script, and a README with the method, the numbers, what the tests don't cover, OpenSubdiv's license (TOST 1.0) and its provenance. Nothing downloaded or built is committed: OpenSubdiv v3_8_0 and the WebAssembly build stay in ~/.cache, outside the repository. A dev-only Vite route serves that build when OPENSUBDIV_WASM_DIR is set, and Dyno's Lab registers a subdivision page. The Lab run is 2026-11-24T12-15-15-415Z-apple-metal-3. A Sonnet review found one Important: the memory comparison counted different things for the two routes. The fix measures both the same way in Node, and the TypeScript route is no longer ranked lower on memory; a scoped check found it closed, with no new Important. 9 tests pass, with mutations shown failing. It touches bench/suite/commands/lab.mjs (one entry) and vite.config.ts (the route), shared with in-flight Dyno work; a conflict would be resolved by keeping both. No owner paths. Checked by the orchestrator on the replay f53a1c0110 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. The spike and its README are in the repository for the subdivision decision.
- B. B. Hold it: Nothing merges; the evidence stays on its branch.

Recommended: A. Merge it. It meets the done-when, its measurements now compare like with like, and nothing downloaded or built is committed.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
