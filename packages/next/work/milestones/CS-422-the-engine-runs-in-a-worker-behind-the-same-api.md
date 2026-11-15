---
id: CS-422
title: The engine runs in a worker behind the same API
kind: capability
status: Planned
created: 2026-11-14
project: CS-13
outcome: "The same app code runs with the engine on the main thread or in a worker, chosen by the host or by a probe, and errors, loss, modules, widgets and the inspector work in both."
done_when:
  - "c1: An app moves the engine into a worker by changing one option, `thread`, and its code otherwise runs unchanged: the API suite passes in main-thread and channel modes, and the worker browser suite's three pages render the same images and answer the same queries with the engine in a worker and on the main thread."
  - 'c2: With `thread: "auto"`, the engine runs on the main thread when a worker can''t start, WebGPU, an adapter or a context is missing, or the probe times out; a forced worker that can''t run rejects `Engine.create` with the reason, and `engine.thread`, `engine.threadReason` and the inspector''s header show the mode and why.'
  - "c3: Engine errors reach the app as events with a code and, in development builds, the app's call stack; when the worker or the GPU device is lost, pending queries reject and the app is told, and `restart()` brings the engine back on a fresh canvas, with the opt-in rebuild returning the scene as it was, with the same handle ids."
  - "c4: A tick module loaded by URL changes the scene in the tick it runs, and a controller module drives the camera from forwarded input, with the engine on either thread."
  - "c5: The Viewer, the inspector and the recorder work in both modes, and a recording from a worker run has the same columns as a main-thread one."
needs:
  [
    CS-108 c1,
    CS-109 c1,
    CS-110 c1,
    CS-111 c2,
    CS-112 c3,
    CS-113 c3,
    CS-114 c4,
    CS-115 c4,
    CS-116 c5,
  ]
check: "integration-test bench/run.mjs worker suite, and test/api in both thread modes"
---

## Done when

Drafted on 2026-11-15 for the owner's review: the clauses, the check and each constraint's clause are in the front matter.

## Check

The worker suite in bench/run.mjs (to be written with CS-110), run as a Dyno run, and `npm test` running test/api/ in both vitest projects, main and channel (to be written with CS-109). c5 also wants a click-through of the Viewer and inspector in Dyno with the engine in a worker and on the main thread.

## Shaping questions

- The outcome says chosen by a probe, but the plan keeps auto on the main thread until the measurement milestone (CS-423) passes; until then the probe only reports what it would pick. Keep the wording, or say so?
- c1 covers the API suite and three pages; moving every example to both modes is CS-120, in CS-456.
- Until CS-106 (in CS-421) lands, a closure passed to an engine-thread function works on the main thread and fails in a worker. Accept that here, or wait on CS-106?

## Notes

Migrated on 2026-11-14 from the milestone "the façade" of CS-13 (its `milestones` list and its items' `milestone` key). Its 9 items are constraints marked `c?` until shaping links each to a clause.

Renamed on 2026-11-14 from "The façade" to its outcome, since HITLd names milestones by the state they reach, with its `outcome` written.
