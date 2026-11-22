---
id: CS-764
title: Engine.create compiles its pipelines in one concurrent round instead of three
kind: work
state: planned
created: 2026-11-20
project: CS-389
touches: [packages/next/src/scene/Engine.ts, packages/next/src/atmosphere/**, packages/next/src/gpu/**, packages/next/test, packages/next/bench/suite/coldStart.mjs]
---

Engine.create awaits three rounds of pipeline compiles in turn: the atmosphere, the sky and the render context, 119 pipelines in all. CS-706 measured engine setup growing from 28 ms to 425 ms between 2026-11-01 and ac8caf26bc, 47% of the cold start's growth. Compiling them in one concurrent round, while the sky builds, should recover most of it.

Source: the owner's answer to CS-714 (A, file both items), 2026-11-20. Why now: the cold start is 1.26 s against a 500 ms goal. Rough size: medium. Decider: the executor, within the touches above. A change to what Engine.create resolves with, or to when the first tick may run, comes back as a question. Filed: 2026-11-20.

## Done when

- The pipelines Engine.create needs compile in one concurrent round. No pipeline waits on another pipeline's compile unless it uses that pipeline's output, and each such wait is named in a comment.
- The coldstart Dyno run (`node bench/suite/cli.mjs coldstart`) measures engine setup before and after, with run IDs cited, and the regression budget in `bench/suite/coldStart.mjs` tightens to what is measured, with headroom stated.
- Pixels are unchanged: the browser parity suites run against the previous commit and a base commit, and any difference is explained.
- Run on a server of the executor's own, never the owner's 5190 or 5199.
