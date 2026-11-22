---
id: CS-816
title: "The host steps the engine: advance to a time, wait until settled, render, read back"
kind: work
state: planned
created: 2026-11-21
project: CS-437
touches: [packages/next/src/time/**, packages/next/src/scene/Engine.ts, packages/next/src/scene/View.ts, packages/next/src/streaming/**, packages/next/src/index.ts, packages/next/test, packages/next/api/surface.txt]
---

Today `Clock.tick(now)` follows the wall clock. `Engine.renderFrame()` and `whenReady()` exist, but `renderFrame` doesn't update tilesets. Simulators and data pipelines step the world themselves: CARLA's synchronous mode "waits for a client tick", MuJoCo is deterministic, and Isaac Lab and Habitat run headless. CS-512 (a virtual clock for Dyno) is the same idea for benchmarks.

Source: the owner's review of 2.0's seams, 2026-11-21, after a survey of physical-AI practice (Omniverse Replicator and Isaac Sim, CARLA, AirSim, MuJoCo, Habitat, Cosmos, USD and glTF semantics). The owner put the four core seams in alpha.1. Why now: it changes the clock and the engine's loop, which freeze at beta.1. Rough size: medium. Decider: the executor. Filed: 2026-11-21.

## Done when

- A host advances the engine to an explicit time or by a step, gets a "settled" promise that resolves once content for that time and camera has loaded, then renders and reads back. Wall-clock pacing is off in this mode.
- Item poses can be written against a time stamp, so an outside simulator can drive transform-graph nodes. This is the pose-write half of a simulation bridge, and CS-676's shapes are the other half.
- The same steps in the same scene produce the same frames on one machine. That's checked by a test on `test/fakeGpu.ts`, and in one browser run on the executor's own server. Cross-machine bit equality isn't promised: Metal can reorder float sums.
- Wall-clock timings are recorded only in real-time runs.
- CS-512 builds on this clock rather than a second one.
- `npm run surface` is run, and `api/surface.txt` is committed.
