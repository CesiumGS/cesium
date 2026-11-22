---
id: CS-934
title: Merge CS-815, stable identity and semantic labels
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: "A. Merge it: The orchestrator replays it again onto main's tip, reruns the gates if main moved, fast-forwards, runs the work check, regenerates the views and logs the merge; CS-847 is rebased onto it."
answered_at: 2026-11-22T17:31:07.497Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-815 into main? Scene content gets 64-bit stable IDs that don't depend on load order, and labels by taxonomy, as CS-832's design gives them. It adds 14 public names and changes PickResult, through owner paths (packages/core/src/index.ts, api/surface.txt), so it waits for your review. CS-922 and CS-923, its two open questions, are built as answered A; CS-847 is stacked on it.

Public names added: DEFAULT_TAXONOMY, EmbeddingSpace, EmbeddingTable, Embeddings, Identified, Identity, IdentityDeclaration, Labels, PickBasis, StableId, StableKey, TaxonomyDeclaration, canonicalSource, stableIdOf. PickResult gains id, labels, basis, coverage, sample, camera (renamed from cameraRecord) and time, and loses featureId, as CS-832's answered design says; ray hits gain id and basis. StableId is a bigint from MurmurHash3_x86_128 over a canonical key (the executor's call on the encoding); collisions are reported, never merged; learned fields and embeddings are reserved and refused. Reviews: the first found one Important problem, that nothing ran the GPU ray-hit ID kernel; fix round 1 (8715c11a29) adds a Lab case, rayIds, that compares each ray hit's id with the real pick pass and a float64 reference (925 of 925 pixels pass; a kernel writing a neighbor's slot fails it), and fixes five Minors (a slot-0 tie, host keys ending in #n, collision clearing, credentials and data: URIs in canonicalSource). A re-review found nothing Important; fix round 2 (eb195f49bb) closes its security Minors: canonicalSource normalizes a reference as the URL parser does, so leading whitespace or a tab can't hide credentials; nothing before an unparseable authority's last @ survives; a data: URI is digested in one streaming pass (20 MB in under 2 s, constant memory; digests unchanged on 41 inputs); a mutation removing the normalization fails two tests. Two new questions from the executor, recommended answers given, for you to settle separately: (1) PickPositionResult and CorePick still say cameraRecord while PickResult says camera; recommend renaming both to camera before alpha.1; (2) a bigint StableId makes JSON.stringify of a PickResult throw; recommend keeping bigint and exporting stableIdToHex and parseStableId. Also proposed by the executor and filed as CS-933: watertight ray casts at shared edges. The branch was cut before CS-612's per-package surface, so the orchestrator's replay adds one commit regenerating api/surface.txt (the names under @cesium/core too). Checked by the orchestrator on main a7e939a5b4 (replay 6ac5d75b7b: eb195f49bb's patch, identical outside work/, plus the surface commit): typecheck, tsc -p ., work check, build, npm test exit 0 (404 files, 6,773 tests), test:data, check:bundle, surface current, shaders:check, eslint. Parity with a separate checkout and server per side (main against the fix-round-1 replay ff9c47ff83; round 2 changed only string handling): parity, selection, tileset, models and heights identical with timings aside, no console errors on either side; rayIds passes on the replay.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it again onto main's tip, reruns the gates if main moved, fast-forwards, runs the work check, regenerates the views and logs the merge; CS-847 is rebased onto it.
- B. Change the names first: Say which names or shape to change (CS-922's and the two new questions' answers); it goes back to its executor for a round, then to the gates and to you again; CS-847 takes the change at its rebase.
- C. Hold it: Nothing merges; CS-847, CS-903, CS-904 and CS-906 wait.

Recommended: Merge it. It builds the design you answered, every gate passes on main's tip, parity holds with separate checkouts, both reviews' Important findings are fixed and shown by mutation, and the open name questions can be settled before alpha.1 without holding the seam's work.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
