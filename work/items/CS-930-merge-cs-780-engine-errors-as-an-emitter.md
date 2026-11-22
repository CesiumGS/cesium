---
id: CS-930
title: Merge CS-780, Engine.errors as an emitter
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: "A. Merge it: The orchestrator replays it again onto main's tip, reruns the gates if main moved, fast-forwards, runs the work check, regenerates the views and logs the merge."
answered_at: 2026-11-22T17:34:55.241Z
answered_via: question-tool
answered_by: owner
---

## Question

Merge CS-780 into main? `engine.errors.on("support", listener)` now hears support notices, as the engine-profiles plan names it. It adds two public type names, `EngineErrorListener` and `EngineErrorLog`, to packages/core/src/index.ts and api/surface.txt, which are owner paths, so it waits for your review.

Your answer to CS-23's first question approved changing Engine.errors' public shape. CS-780 keeps `engine.errors` as the same read-only list (every existing reader keeps working: filter, length, spread) and gives it a non-enumerable `on(kind, listener)`, plus `on(listener)` for every kind. A listener gets the EngineError entry (kind, message, count, notice), the same live object whose count grows with repeats, as its TSDoc says; it hears only later reports, repeats included. `onError` stays as a documented shorthand for every kind: removing it would be your call, and nothing needs it gone. It works on both backends: WebGPU (fake device) and WebGL 2 (fake GL in Node) each have a test that a notice is heard once and a stopped listener hears nothing. A Claude review found one Important problem: a listener that throws escaped report(), which runs inside the tick, and stopped the other listeners (the old onError loop had the same gap). The fix round (6c749b5e0e) calls each listener in its own try/catch and logs a throw with console.error, never through report(); iterates a snapshot, so a listener added mid-report waits for the next; and clears the listeners at Engine.destroy. Removing the try/catch fails both throwing-listener tests. Worker mode needs nothing yet: no thread proxy exists, and the protocol table classes `errors` as a page-side snapshot. Public names added: `EngineErrorListener` (type) and `EngineErrorLog` (interface); nothing changed or removed. The branch was cut before CS-612's per-package surface, so the orchestrator's replay adds one commit regenerating api/surface.txt, which lists the two names under @cesium/core as well as the umbrella. Checked by the orchestrator on main d315ddeb92 (replay 2c0c567551: 6c749b5e0e's patch, identical outside work/, plus the surface commit): typecheck, tsc -p ., work check, build, npm test exit 0 (402 files, 6,727 tests), test:data exit 0, check:bundle exit 0, surface current (1,838 exports). Nothing draws differently, so no parity.

Rule basis: public-commitment. Reversibility: two-way.

## Options and recommendation

- A. Merge it: The orchestrator replays it again onto main's tip, reruns the gates if main moved, fast-forwards, runs the work check, regenerates the views and logs the merge.
- B. Change the names first: Say which names or shape to change; it goes back to its executor for a round, then to the gates and to you again.
- C. Hold it: Nothing merges; CS-763 and CS-764, which change Engine.ts after it, wait.

Recommended: Merge it. It does what your CS-23 answer asked with two added type names and no change for existing readers, every gate passes on main's tip, and the review's Important finding is fixed and shown by mutation.

If unanswered by 2026-11-25T12:00:00Z: Hold it.

## Answer

Recorded in the front matter once answered.
