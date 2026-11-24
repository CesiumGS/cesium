---
id: CS-1203
title: test/curvilinearRoutes.test.ts settles until no route is pending
kind: work
state: proposed
created: 2026-11-23
project: CS-10
touches: [test/curvilinearRoutes.test.ts]
---

> **Proposal.** Source: CS-955's executor report, relayed by orch-11 (2026-11-24). Why: the test fails on the base commit under load, because a 3-tick settle races the lazy load of the Cesium IR. It is one of the load-sensitive tests that make batch suites red. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The test settles until no route is pending, with a bounded wait, instead of a fixed 3 ticks.
- It passes under load, shown by a run during a batch suite.
