---
id: CS-421
title: Every public call can cross a thread
kind: capability
status: Planned
created: 2026-11-14
project: CS-13
outcome: "On the main thread, reads are promises, per-tick snapshots or tracked points, writes are commands, functions the engine runs are modules or programs, and engine internals are out of the main entry."
done_when:
  - "c1: An app reads engine-computed state only from the per-tick snapshot, tracked points or promises; the only synchronous reads that take arbitrary arguments are `toPixel` and `fromPixel`, and the examples render at their parity baselines."
  - "c2: Every public write takes effect without `requestRender()`, and the engine never reads an object after the app has changed it in place."
  - "c3: Every function the engine runs on its own thread (warps, smooth edges, frame resolvers, standing queries, tick compute) is passed as a module by URL or as a Cesium IR program; a closure passed there is refused in both modes with a diagnostic naming the captured variable, while callbacks that run on the page still take closures."
  - "c4: The main entry exports nothing that can't cross a thread; GPU internals are reachable only through `@cesium/next/gpu`, and the night-sky and translucency examples still run."
  - "c5: Content is placed by its declared CRS's type, with no placement mode: the 3D Tiles draft's `EXT_geospatial_crs` and node `EXT_georeference` are read, and the design globe draws on the warp path."
needs: [CS-103 c1, CS-104 c2, CS-105 c3, CS-106 c3, CS-107 c4, CS-378 c5]
check: "integration-test test/threadProtocol.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written with CS-101: every member of api/surface.txt has a kind, every command's arguments structured-clone, and every snapshot read has a section. Run with test/importBoundary.test.ts and the `bench/run.mjs parity` suites at their baselines.

## Shaping questions

- CS-378 (placement by CRS) isn't about crossing a thread; it is here so the API is reshaped once. Keep c5 (and say so in the outcome), or make CS-378 a contribution?
- CS-105's Done-when ends with CS-91's fits running off the main thread, and CS-91 is in CS-463: move that part to CS-91?
- c3's closure refusal (CS-106) waits on Cesium IR, so this milestone will likely close after CS-422, which builds on it.

## Notes

Migrated on 2026-11-14 from the milestone "reshape" of CS-13 (its `milestones` list and its items' `milestone` key). Its 5 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 from "Reshape" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.

CS-378 joined this milestone on 2026-11-15, on the owner's answer: placement modes go in the reshaping, once the review approves.
