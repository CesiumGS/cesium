---
id: CS-758
title: Merge CS-567, the protocol table covers every member of the engine types
kind: decision
state: planned
created: 2026-11-20
project: CS-13
decider: owner
---

## Question

Merge CS-567, which makes the worker protocol table name a thread kind for every public member of the engine's classes and interfaces (1,006 members on 53 types), checked by name with no pinned totals, into main?

Each member is read from the TypeScript checker and must appear once in src/thread/protocol.ts under one of ten kinds (snapshot, mutation, command, callback, cannot-cross and the rest, with their rules in the file's header). A new public member, a removed one, a ghost, a duplicate or a field listed as a command fails the test by name. api/surface.txt and its readers (the handbook, the API reference) are unchanged. The plan's 1,062 was a hand count that also took nested fields; its section 1 now says so. Totals: 137 mutation, 224 cannot-cross, 52 callback, none pinned. CS-23 adds one name per new Engine or View member, with no count to bump. Outside its touches: the worker-facade plan's section 1, scripts/surfaceMap.d.mts, and one exemption in test/deviceFactsSeam.test.ts (CS-22's seam test matched the member name adapterInfo in the table, which reads nothing). Checked by hand on main b38ea11175 (tested 6cb336d475): both type checks, hitld work check (755 files), surface (no API change), npm test exit 0 (5,829 passed, no unhandled errors), test:data exit 0; no CSS touched. Presentation: orch-11-merge-ready-CS-567.md in the orchestrator's notes.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the type checks and work check, fast-forwards main, regenerates the views and logs the merge; CS-23 (Engine and View) starts on it once CS-33 merges.
- B. Hold it: Nothing merges; the protocol table keeps classifying exported names only, and CS-23 waits for it.

Recommended: Merge it. Every gate passes on main's tip, nothing public changes, and it gives CS-23 a by-name check instead of a count.

If unanswered by 2026-11-22T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
