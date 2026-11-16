---
id: CS-459
title: Failed content recovers on its own
kind: milestone
state: planned
created: 2026-11-15
project: CS-16
outcome: "Tiles, terrain and imagery that fail keep their parent on screen and recover after cool-downs, ion tokens renew, the engine resumes cleanly after being offline or hidden, and an app can refresh its own auth."
done_when:
  - "c1: A 3D Tiles child whose content answers 404 or 204 leaves its REPLACE parent drawn, with no hole, and the tileset settles; a tile that fails three times cools down (30 s, then 2 minutes, then 10 minutes) and loads again if the view still wants it, and `retryFailed()` brings every failed and cooling tile back at once."
  - "c2: On the globe, a transient terrain or imagery failure retries and loads; a terrain tile that answers 404 is drawn upsampled from its nearest ancestor with heights, and a failed imagery source shows its parent's imagery and recovers after its cool-down."
  - "c3: When an ion token is rejected mid-session, 50 tiles failing with 401 at once cause one endpoint fetch and load with the new token; a token rejected again after its refresh cools those tiles instead of refreshing in a loop, the app gets one engine error per origin and kind, and no token or query string appears in any output."
  - "c4: While the page is offline, no new request starts and wanted tiles stay pending; on coming back online, tiles cooled by network failures or timeouts load again with no app call, and a request that overlapped a hidden tab or a sleep of more than 1 s isn't counted as a failure."
  - "c5: When a source's server answers 401 or 403, the app's `onAuthFailure` runs once per generation, concurrent failures sharing one call; the source's requests continue with the headers or query parameters it returns, and fail if it returns nothing."
constraints: [CS-148 c1, CS-149 c2, CS-150 c3, CS-151 c4, CS-157 c5]
contributions: [CS-158 value=2 confidence=0.5]
check: "integration-test scripts/faultCheck.mjs, extended"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

Written under CS-154 by someone other than the authors of CS-147 to CS-151 and CS-157, and extended with a terrain 404, an imagery outage, an offline then online toggle and an app `onAuthFailure` hook; cool-downs shortened through `engine.network.cooldownsMs`. It asserts from `stats.net` and the final state that the tileset and globe converge with no failed tile, and that the 404 child's parent stayed drawn.

## Shaping questions

- CS-158 (Cesium ion's answers) moved here from CS-458 as a contribution (the owner's answer of 2026-11-15); its value and confidence are placeholders until shaping scores it.
- Whether a 403 also triggers a token refresh is settled only when CS-150 measures the real service with a token you supply; that isn't in CS-150's Done-when yet.
- c4's 1 s and 2 s thresholds are design values until CS-151 measures worker timer drift in hidden tabs.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 7 items are constraints marked `c?` until shaping links each to a clause.
