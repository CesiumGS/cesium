---
id: CS-794
title: The transform passes load Cesium IR lazily, so a default view starts without it
kind: work
state: done
created: 2026-11-21
project: CS-10
needs: [CS-53]
claimed_by: orch-11-CS-794
touches: [packages/next/src/transform/**, packages/next/src/ir/**, packages/next/src/scene/Camera.ts, packages/next/test, packages/next/bench/suite/coldStart.mjs]
---

Since CS-53, `src/transform` imports Cesium IR's AD, builder and scalarize modules at load. That raised the viewer's startup modules from 492 to 501, about 47 ms of cold start. With the machine also slower than overnight, main now measures about 1,400 ms on a quiet machine, right at the budget. Under the owner's rule (CS-715), engine merges stay held until a plain check passes. Only content under a curvilinear map compiles routes, so a default view needs none of Cesium IR at start.

Source: orch-11's cold-start checks after CS-53, 2026-11-21: runs 2026-11-21T16-10-32-739Z-mac-apple and 2026-11-21T16-25-40-270Z-mac-apple. The owner chose this small fix ahead of CS-765 (option A). Why now: CS-35 and every later engine merge wait on it. Rough size: small. Decider: the executor, within the touches above. A change to a public type or to what `Engine.create` resolves with comes back as a question. Filed: 2026-11-21.

## Done when

- A default view loads none of Cesium IR's modules at start. The startup module count is back to at most 492 or names what replaced the difference, and a test fails if `src/transform` imports Cesium IR eagerly again.
- The first route that compiles under a curvilinear map loads Cesium IR then, and CS-53's 28 golden fixtures still match bit for bit.
- A plain cold-start check on main passes within 1,400 ms on a quiet machine on AC power, with its run ID cited.
- Focused tests while iterating wait whenever a cold-start quiet request stands, and full suites go through `heavy-job-gate.sh`. Never a bare `npx dyno`.
