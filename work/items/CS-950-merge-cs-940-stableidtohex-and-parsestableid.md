---
id: CS-950
title: Merge CS-940, stableIdToHex and parseStableId
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

Merge CS-940, the two StableId helpers your CS-936 answer named, into main? It adds two public names, stableIdToHex and parseStableId, through owner paths (packages/core/src/index.ts and api/surface.txt).

stableIdToHex(id) writes a bigint StableId as exactly 16 lowercase hex digits, zero-padded; it throws a TypeError for a value that isn't a bigint and a RangeError outside 0 to 2^64 - 1. parseStableId(text) reads exactly 16 hex digits back (uppercase accepted); it throws a TypeError for a non-string and a SyntaxError for anything else (a sign, a 0x prefix, whitespace, 15 or 17 digits), giving the length, never the input. The doc comments say JSON.stringify throws on a bigint and show the round trip with a replacer and a reviver. The executor's call: 16 zeros reads back as 0n, because hashKey never makes 0 but 0 is the slot table's none value, and a list holding none must round-trip; documented and tested. Tests cover zero, the largest 64-bit value, a stableIdOf value and every refused form. The surface gains four lines (the two names in the umbrella's section and in @cesium/core's); the handbook's API map and the thread protocol table list them. The orchestrator read the code. Checked by the orchestrator on main 1f52eb9630 (replay 8729b77c78 of 6cbcf60684, patch identical outside work/): typecheck, tsc -p ., work check, build, test:data, check:bundle, surface current, eslint, the handbook; npm test failed one test under load, test/noSceneGains.test.ts, which passed alone 8 of 8, the known load failure. Main has moved since, so the orchestrator replays again and reruns the gates before merging.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, reruns the gates, fast-forwards, runs the work check, regenerates the views and logs the merge.
- B. Change the names first: Say what to change; it goes back to its executor for a round, then to the gates and to you again.
- C. Hold it: Nothing merges; alpha.1 waits on it.

Recommended: Merge it. It is exactly what your CS-936 answer asked for, two names with full tests, and every gate passes on main apart from a known load failure that passes alone.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
