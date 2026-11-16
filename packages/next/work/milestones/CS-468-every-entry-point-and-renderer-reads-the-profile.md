---
id: CS-468
title: Every entry point and renderer reads the profile
kind: milestone
state: planned
created: 2026-11-15
project: CS-8
outcome: "Whichever way an app reaches the engine (the main entry, the advanced GPU entry, the Viewer or worker mode), it gets support reports and defaults from the same profile, the main API names no GPU type, and an app or a second renderer can give the engine's queries its own ray backends."
done_when:
  - "c1: An app that imports only `@cesium/next` sees no GPU type; hosts that share a device, tools and tests get `GpuDevice`, `DeviceFacts`, `LimitsTier` and the personas from `@cesium/next/gpu`, where `engine.facts` replaces `Engine.capabilities`."
  - "c2: A Viewer and a bare `Engine` give the same default look from one defaults table (shadows on as preferred, ambient occlusion on as extra); the Viewer's World capacities come from device limits, and any clamp is reported."
  - "c3: In worker mode, `view.support`, `view.effective` and `view.explain()` return what they return on the main thread, and under `strict` a pinned step that can't run throws synchronously on the main thread in both modes."
  - "c4: An app, or a second renderer, can give `Engine.queries` its own ray backends, and `castRays` and standing queries answer through them."
constraints: [CS-28 c1, CS-29 c2, CS-31 c3, CS-368 c4]
check: "integration-test test/profileEntryPoints.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written: a view built three ways on the fake devices (a bare `Engine`, the Viewer and worker mode), comparing their `support` and `effective` snapshots and the `strict` throw from the worker snapshot. Backing: test/importBoundary.test.ts and test/surface.test.ts (c1), and test/queriesEngine.test.ts with a supplied backend (c4).

## Shaping questions

- `emulate` is CS-27, in CS-467 (fidelity adapts without silent fallbacks); c1 leaves it out.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 5 items are constraints marked `c?` until shaping links each to a clause.
