---
id: CS-711
title: Add a signal option to cancel an engine create in flight
kind: decision
state: done
created: 2026-11-19
project: CS-437
decider: owner
answer: "A. Add it to Engine.create: A follow-up item adds `signal?: AbortSignal` to EngineOptions, documented in Engine's lifetime contract, with a test that an aborted create releases its device and pipelines."
answered_at: 2026-11-21T04:58:01.916Z
answered_via: question-tool
answered_by: owner
---

## Question

Should Engine.create (and Viewer.create) take a public `signal?: AbortSignal` option, so a caller can cancel a create in flight, such as the device request and pipeline builds?

CS-708 made create, dispose and create again safe under React strict mode without any new option: the Viewer waits for a create in flight and adopts its engine, and frame-data loads are shared and cancelled. A create that is cancelled midway still finishes its device request and pipelines before it is disposed. The executor recommends a signal on Engine.create only, since the Viewer is safe without one. It is a new public option, so the owner decides it; CS-708 merges either way.

Rule basis: one-way-door. Reversibility: one-way.

## Options and recommendation

- A. Add it to Engine.create: A follow-up item adds `signal?: AbortSignal` to EngineOptions, documented in Engine's lifetime contract, with a test that an aborted create releases its device and pipelines. (cost: A small item; one more public option to keep.; hard to undo)
- B. Add it to both: The same, and ViewerOptions passes its signal through to the engine. (cost: Two public options to keep where one would do.; hard to undo)
- C. Not now: No new option; a cancelled create finishes its startup work and is then disposed, as CS-708 leaves it. (cost: Some wasted startup work when a create is cancelled.)

Recommended: Add it to Engine.create. It is the executor's recommendation: it lets callers stop the costliest part of a cancelled start, and the Viewer already handles the strict-mode case without it.

## Answer

Recorded in the front matter once answered.
