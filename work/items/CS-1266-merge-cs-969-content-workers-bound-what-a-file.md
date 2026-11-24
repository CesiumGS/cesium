---
id: CS-1266
title: Merge CS-969, content workers bound what a file states
kind: decision
state: planned
created: 2026-11-24
project: CS-191
decider: owner
---

## Question

Merge CS-969 into main? Every content worker now charges what a file states against named limits before it allocates, refuses by name with fixed text, and a watchdog ends a hung worker, fails its jobs and frees its slot.

The limits are named constants in io/contentLimits.ts: a 2 GiB work budget per content, charged before allocation and shared by a composite's inner tiles; caps on glTF nodes, depth, resources, accessors, meshopt stride, features, array elements, image size and b-reps. Covered: glTF and GLB (meshopt, Draco copy-outs, EXT_mesh_features), b3dm, i3dm, pnts and cmpt headers and batch tables, KTX2 and image headers, quantized-mesh terrain (indices, high-water mark, edges) and BENTLEY_brep. The watchdog pings each worker. One that doesn't answer for 30 s is ended, its jobs fail, and its slot restarts fresh, with no retry; a throttled tab doesn't count as a hang. Tests feed small hostile files: 31 hostile-file cases and 11 watchdog cases, 30 of 30 mutations caught. An Opus security review found one Important: the b-rep reader allocated outside the budget, so about 10,000 aliased entries asked for about 320 GB. Fixed in one round, with an entry cap of 16,384 b-reps and the whole content refused; a scoped Opus check confirmed it closed (an aliasing probe refused in 169 ms), with the GIF frame-size, fixed-text and AVIF-fallback Minors done. Behavior changes for honest content: images whose header gives no size (AVIF, ICO) are refused before decoding (your Q2); a node reached twice draws once with a warning; past 16,384 b-reps the whole tile is refused. Follow-ups, not blockers: one image path copies a view before charging it (up to 4,096 throwaway copies, a time sink the watchdog bounds); two warnings echo a file's index text; KTX2 is charged at RGBA8; WebAssembly heaps (Draco, meshopt) grow before checks; jobs sharing a hung worker fail with it; feature IDs at or above the feature count, glTF indices against the vertex count, and the tile tree's depth and cycles. Your Q1 (public limits) and Q2 (keep refusing headerless images) are filed separately and don't block this merge. No owner paths. Checked by the orchestrator on the replay f48a97b013 (patch identical outside work/). Under your batch rule, the full suite runs once on the batch before any merge.

Rule basis: security. Reversibility: two-way.

## Options and recommendation

- A. A. Merge it: It joins the next batch; once the batch's full suite passes, the orchestrator merges it with `merge-item.sh`. CS-145 (the fetch layer) can then start, and the follow-ups are filed.
- B. B. Hold it: Nothing merges; content workers keep trusting the sizes and counts a file states.

Recommended: A. Merge it. It closes the security findings on content workers, both reviews' Importants are closed, and the leftovers are bounded follow-ups.

If unanswered by 2026-11-26T12:00:00Z: B. Hold it.

## Answer

Recorded in the front matter once answered.
