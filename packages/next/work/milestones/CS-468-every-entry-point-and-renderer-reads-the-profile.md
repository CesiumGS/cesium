---
id: CS-468
title: Every entry point and renderer reads the profile
kind: capability
status: Planned
created: 2026-11-15
project: CS-8
outcome: "Whichever way an app reaches the engine (the main entry, the advanced GPU entry, the Viewer, the WebGL 2 renderer or worker mode), it gets support reports and defaults from the same profile, and the main API names no GPU type."
done_when:
  - "c1: An app that imports only `@cesium/next` sees no GPU type; hosts that share a device, tools and tests get `GpuDevice`, `DeviceFacts`, `LimitsTier` and the personas from `@cesium/next/gpu`, where `engine.facts` replaces `Engine.capabilities`."
  - "c2: A Viewer and a bare `Engine` give the same default look from one defaults table (shadows on as preferred, ambient occlusion on as extra); the Viewer's World capacities come from device limits, and any clamp is reported."
  - "c3: A WebGL 2 view's `view.support` has a WebGPU view's shape, names the renderer, and gives facts under WebGL's own names; every feature it lacks is off with the rule that says why, and the profile's invariant tests pass on `webgl2-basic` and `webgl2-chrome`."
  - "c4: In worker mode, `view.support`, `view.effective` and `view.explain()` return what they return on the main thread, and under `strict` a pinned step that can't run throws synchronously on the main thread in both modes."
  - "c5: An app, or a second renderer, can give `Engine.queries` its own ray backends, and `castRays` and standing queries answer through them."
needs: [CS-28 c1, CS-29 c2, CS-30 c3, CS-31 c4, CS-368 c5]
check: "integration-test test/profileEntryPoints.test.ts"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

To be written: a view built four ways on the fake devices (a bare `Engine`, the Viewer, `emulate: "webgl2-basic"` and worker mode), comparing their `support` and `effective` snapshots and the `strict` throw from the worker snapshot. Backing: test/importBoundary.test.ts and test/surface.test.ts (c1), and test/queriesEngine.test.ts with a supplied backend (c5).

## Shaping questions

- CS-368 (query backends) doesn't read the profile; it opens a seam for ray backends. Move it to a renderers-and-queries milestone (or CS-414's seam), or keep c5 here?
- c3: the plan's required-content invariant can't hold while the WebGL 2 device only clears (CS-35). Should CS-30 wait for CS-36 and CS-37, or check that invariant only from then?
- `emulate` is CS-27, in no milestone; if c1 should include it, CS-27 is a missing constraint.

## Notes

Proposed on 2026-11-15 for items no milestone held, and applied on the owner's answer. Its 5 items are constraints marked `c?` until shaping links each to a clause.
