---
id: CS-460
title: Network health is visible and guarded
kind: milestone
state: planned
created: 2026-11-15
project: CS-16
outcome: "The inspector and the recorder show each origin's health, refinement names network waits, a headless fault check and a zero-fault parity guard run with the tests, and the handbook explains it."
done_when:
  - "c1: For each origin (host only), the inspector's Network section shows the protocol, window, requests in flight, time to first byte at p50 and p95 and the derived timeouts; a state chip (ok, backing off with seconds left, offline, token refreshing); counters for timeouts, retries and failures by class; each tileset's failed list with a Retry failed button; and failures and retries on the shared time axis, with a layout that doesn't move between states. A recorder CSV carries `net_timeouts`, `net_retries`, `net_failed` and `net_paused`, and Dyno's report and diagnose scripts read them."
  - "c2: While tiles wait out a backoff, the streaming refinement entry is pending with the reason; a tile that has failed counts as failed until its cool-down ends, `converged({ timeoutMs })` against a flaky origin ends with the failure counted, and a request that never answers is never reported as a stall."
  - "c3: A headless fault check passes on its own port with the real worker and no ion token (transient faults retry and load, a stall times out and recovers, a 404 child leaves its parent drawn, a rejected token refreshes once, and the tileset converges), and every 2.0 parity and benchmark page fails if a healthy run at the full or the 20 Mbit/s, 80 ms profile shows any timeout, retry or failure."
  - "c4: An app developer finds in the handbook what the engine does when the network misbehaves (deadlines, retries, cool-downs, missing content, tokens, offline, `engine.network`, `retryFailed()` and the failed event), on a page with a checked date whose numbers match the shipped defaults."
constraints: [CS-152 c1, CS-153 c2, CS-154 c3, CS-155 c4]
contributions: [CS-177 value=2 confidence=0.5, CS-178 value=2 confidence=0.5, CS-179 value=2 confidence=0.5]
check: "demo the inspector's Network section on the fault server's synthetic tileset"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

A reviewer who didn't build CS-152 opens the inspector on scripts/faultServer.mjs's synthetic tileset while its script injects a 503 storm, a Retry-After pause, an offline toggle and a token rejection, and watches the chips, counters, series and Retry failed; then reads the net columns of a Dyno run in report.mjs. For c3, a time-to-first-byte floor set too low through `engine.network.timeouts` must make a parity page fail.

## Shaping questions

- CS-177, CS-178 and CS-179 are contributions, not constraints (the owner's answer of 2026-11-15); their value and confidence are placeholders until shaping scores them.
- c3 says the check passes, not that it runs per merge; per-merge runs would be CI work (CS-483 or CS-486) that no item here holds.
- c2 also needs CS-134 (project CS-15), through CS-153's needs.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 7 items are constraints marked `c?` until shaping links each to a clause.
