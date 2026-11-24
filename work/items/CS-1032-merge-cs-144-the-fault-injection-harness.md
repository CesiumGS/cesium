---
id: CS-1032
title: Merge CS-144, the fault-injection harness
kind: decision
state: done
created: 2026-11-22
project: CS-16
decider: owner
answer: "A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; CS-145, the fetch layer, starts next on the chain."
answered_at: 2026-11-24T00:09:51.403Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-144, the fault-injection harness (test/faultNetwork.ts and its tests), into main? It is test code only, the first link of alpha.1's longest chain (CS-145 to CS-149 build on it), and touches no owner path.

A fake network on a virtual clock: FakeClock fakes timers, performance, Date and AbortSignal.timeout; FaultNetwork answers by rules with latency, jitter, status, headers (Retry-After in both forms), chunked bodies, drops before and mid-body, stalls and aborts, all ordered by the clock, with a seed that repeats a run exactly; an adapter, faultLoadGltf, runs the real parseGltf through engineFetch and CS-809's FetchProvider. A Claude review found four Important problems: the adapter bypassed the real load path; body time followed the reader instead of the clock; the seed test could not fail; an abort after completion discarded a queued chunk. The fix round (76108ec2df) fixed each, shown by mutation (body timers on reads: 7 tests fail; seed ignored: 3; abort listener kept: 1). A re-review found no new Important problems; its Minors (the adapter does not cross the worker hop, so an error's class may not survive postMessage; the body buffer has no backpressure; the seed test could vary drops) go into CS-145's brief. Checked by the orchestrator on main 60fa5287fc (replay d8318346a3 of 76108ec2df, patch identical outside work/): typecheck, tsc -p ., work check, build, test/faultNetwork.test.ts three runs in a row (62 of 62 each); npm test failed one test under load, test/noSceneGains.test.ts, which passed alone 8 of 8 (its cause, View.transition not zeroed, was found by CS-966's executor); test:data failed dish-tracks under load, which passed alone twice at a lower load (60 of 60). CS-144 adds only test files, so neither failure is from it.

Rule basis: rule-change. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it onto main's tip, fast-forwards, regenerates the views and logs the merge; CS-145, the fetch layer, starts next on the chain.
- B. Hold it: Nothing merges; the chain waits.

Recommended: Merge it. It is test code only, the review's Important findings are fixed and shown by mutation, its tests are deterministic, and the chain waits on it.

If unanswered by 2026-11-24T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
