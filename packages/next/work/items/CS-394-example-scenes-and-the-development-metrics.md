---
id: CS-394
title: Example scenes and the development metrics
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-393]
---

`catalog/dev.json` and group D; `example.html` in the frozen build. The host pose contract (`camera=`) and declared example parameters. The settle rule, with "not settled". The metrics of section 4: tiles and requests per tileset, requests and bytes by host class, triangles and draws, GPU per pass, `probe=sse`, page errors. Tileset labels in the vertical-exaggeration example. Group D kept out of headline means, Overview and budgets. "Measure this" in the Examples view.

Adopts `view.converged()` (CS-136) for the settle rule when it lands, as CS-142 migrates the other waits.

## Done when

`run --scenes vex-x10-zermatt` measures the example from the frozen build and records every metric in the table. A capped run is reported as not settled, not failed. `param.x` sweeps. Group D scenes don't change Overview's numbers.

## Files

new `bench/suite/catalog/dev.json`, `example.html`, `exampleDriver.ts`; `manifest.mjs`, `cli.mjs`, `frozen.mjs`, `schema.ts`, `report.mjs` (`METRICS`), `examples/index.ts`, `views/exampleRun.ts`, `views/Examples.tsx`, `examples/vertical-exaggeration/main.ts` (labels only), `scorecard.mjs`

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
