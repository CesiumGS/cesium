---
id: CS-1083
title: Merge CS-940, the StableId hex helpers with a branded StableId
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

Merge CS-940 into main? It adds the public stableIdToHex and parseStableId, and, under your CS-997 B, makes StableId a branded bigint: a plain bigint no longer passes where a StableId is asked for. This replaces CS-950, which asked about the unbranded version.

stableIdToHex writes a StableId as exactly 16 lowercase hex digits, and parseStableId reads 16 hex digits back (uppercase accepted). Either throws on anything else, giving the length or the type, never the input. StableId is now bigint joined with a declared unique symbol, so the brand exists only in types and emits no runtime export. Only stableIdOf, parseStableId and the engine's slot reads make one, through an internal helper. Zero is a branded StableId, the slot table's none value. Picks, ray hits and identify return branded IDs. identify, setLabels, Embeddings and RayQuery.id now refuse a plain bigint at compile time: that is the break CS-997 B chose, and no code in the repository relies on the old form (crs, frames, measure, ui, the umbrella and the examples never use StableId). A type test shows tsc refuses a plain bigint. A fresh Claude review (Sonnet) found nothing Important. Its Minors go into a later round: one refused-form test case is the wrong length to test its form, a short input isn't checked to be absent from the message, setLabels refuses the none value without saying so, and two doc lines. Checked by the orchestrator: gates on 502075d452 passed (build, test:data 615 of 615, checkBundle, surface, eslint, handbook). npm test failed one test under load, test/noSceneGains.test.ts, which passed alone 8 of 8, the known load failure. Replayed again on main with CS-613, CS-943 and CS-939 as 6867eb2d53 (patch identical outside work/): npm ci, tsc --build, tsc -p ., surface --check (1,876 exports) and its tests (55 of 55) clean.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge. CS-950 is closed as superseded.
- B. Hold it: Nothing merges; StableId stays a plain bigint and the helpers wait.

Recommended: Merge it. It is the branded type you chose in CS-997 B with the helpers CS-936 asked for, the review found nothing Important, and the gates pass apart from a known load failure that passes alone.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
