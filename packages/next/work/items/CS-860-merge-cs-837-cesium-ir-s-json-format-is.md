---
id: CS-860
title: Merge CS-837, Cesium IR's JSON format is experimental at cesium-ir/0.1
kind: decision
state: done
created: 2026-11-21
project: CS-10
decider: owner
answer: "A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. CS-54 (routes on both emitters) can then start once CS-794 merges."
answered_at: 2026-11-22T06:15:39.538Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-837, which moves Cesium IR's JSON format from cesium-ir/1.0 back to cesium-ir/0.1 and marks it experimental until it graduates through the API review (CS-102), into main? It changes src/ir/FORMAT.md, an owner path.

As the owner answered CS-836 ('Merge as 0.x'): IR_VERSION and the writer are cesium-ir/0.1. A 0.x reader reads exactly its own version and refuses every other, naming both: 0.0, 0.2, 0.10, 1.0, 1.7 and 2.0 are refused with 'unknown version 'cesium-ir/0.2'; this reader reads 'cesium-ir/0.1' only (0.x is experimental: any 0.x release may change the format)'. The unknown-major fixture is still refused. FORMAT.md says the format is experimental, that any 0.x release may change it, and that it graduates to 1.0 only through CS-102; CS-49's versioning rules stay in the file under 'Versioning from 1.0', and stay in the reader for a 1.x reader, covered by tests through a FormatOptions.readsVersion option (the newer-minor fixture stays at 1.7 for that). The schema is renamed cesium-ir-0.1.schema.json, and its op-list test is kept. All 358 test programs still round-trip; the IR tests pass 451 of 451. No file writes IR outside src/ir/json.ts and the tests. test/irSpike.test.ts no longer needs its version-normalizing line. Executor's calls (reversible): exact own 0.x only, not any 0.x. Checked by the orchestrator: the gates on replay fdcaa1cbc6 (same trees): both type checks, work check (853 files), surface unchanged, npm test 381 of 382 files with noSceneGains the only failure, and test:data 55 of 56 with dish-tracks the only failure, both known load failures that pass alone (8 of 8, 5 of 5); markdownlint on FORMAT.md 0. On main 101ef39347, the replay f4eabfcdfd of the trailer-corrected tip 5a5c365939 is patch-identical, the IR tests pass 451 of 451, and the work check passes (857 files). Nothing at startup imports the JSON modules, and under CS-715's replacement note no cold-start check applies.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator fast-forwards main to the checked replay (replaying again if main moved), regenerates the views and logs the merge. CS-54 (routes on both emitters) can then start once CS-794 merges.
- B. Hold it: Nothing merges; main keeps cesium-ir/1.0 with its versioning rules in force, which the owner asked to keep experimental.

Recommended: Merge it. It does what the owner asked in CS-836, every program still round-trips, other versions are refused by name, and every gate passes but two known load failures that pass alone.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
