---
id: CS-458
title: Every fetch has a deadline and retries within its origin's budget
kind: capability
status: Planned
created: 2026-11-15
project: CS-16
outcome: "Every request the engine makes has a deadline set from what its origin has delivered and fails with a kind an app can read; transient failures retry with backoff inside per-origin budgets, and apps can route requests with 1.x's proxies, query parameters, headers and credentials."
done_when:
  - "c1: A request that gets no headers, stops between body chunks, or runs past its whole-body deadline fails within that deadline, frees its request slot, and fails with a kind (timeout and its phase, network, a status class, decode), while a cancel stays a cancel; this holds for content, terrain, imagery, tileset JSON and the one-off loads, and no failure message carries a URL, a query string or a header value."
  - "c2: A slow but healthy origin is not timed out (on the recorded full profile and the 20 Mbit/s, 80 ms profile, no request times out); a 429, a 503 or a timeout halves an adaptive request window and leaves a pinned one alone, and a Retry-After of up to 60 s pauses every request to that origin."
  - "c3: A transient failure on 3D Tiles content retries with jittered backoff and loads, and with 200 tiles wanted from a dead origin the attempts stay bounded: retries hold at most a quarter of the window, an empty retry bucket stops them, and a tile's first request is never refused."
  - "c4: An app can give a tileset, terrain or imagery source a proxy (a prefix or a function), query parameters, headers and trusted-origin credentials, and every request that source makes carries them; cookies go only to trusted origins, and no option value appears in any diagnostic."
needs: [CS-144 c1, CS-145 c1, CS-383 c1, CS-146 c2, CS-158 c2, CS-156 c4]
check: "integration-test test/networkFaults.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written by someone other than the authors of CS-145, CS-146, CS-147 and CS-156, on test/faultNetwork.ts: a fake-device tileset through a stall at the headers, a stall mid-body, a mid-body drop, a 503 storm on 200 tiles, a 429 with Retry-After, the recorded 20 Mbit/s, 80 ms profile and a proxy prefix, asserting each clause and searching every failure, stat and log line for URLs and header values. scripts/faultCheck.mjs (CS-154) can run c1 and c4 again with the real worker.

## Shaping questions

- c3 has no item here: its work is CS-147, in CS-459. Move CS-147 here (as c3)? This milestone's title is CS-147's subject.
- CS-158 (Cesium ion's answers) is a contribution, not a constraint: the plan handles ion's statuses by class. Move it to CS-459, next to token refresh (CS-150)?
- CS-383's retry half waits on CS-88 (in CS-462); only its timeouts and failure kinds make c1 true. Split it?
- c2 rests on recorded throttled profiles, not real users' links (that is CS-179).

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 6 items are constraints marked `c?` until shaping links each to a clause.
