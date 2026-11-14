---
id: CS-393
title: The settings registry and multi-axis sweeps
kind: work
status: Planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

`settings.mjs`, and validation before a run. `engine.` and `view.` settings applied by the catalog adapter (`lodExponent`, `shadows`, `debug`, `occlusionCull`, `coarsen`, `lod`). Repeated `--sweep`, `--sweep-file`, `--reference`, `--reference-reps`, the point count and `--yes`. The sweep record with `axes`, `reference` and `points`, reading old one-axis records.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

`--sweep lodExponent=0,1` is refused with the list of settings. A two-axis sweep on a catalog scene records every point and its coordinates. `view.lodExponent` reaches the view: a test reads it back from the page. Old sweep runs still plot.

## Files

new `bench/suite/settings.mjs`; `cli.mjs`, `engineBuilds.mjs`, `engines.mjs` (labels), `suite.ts` (the adapter), `schema.ts`, `report.mjs`

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
