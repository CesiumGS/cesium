---
id: CS-765
title: Optional subsystems load lazily instead of through the @cesium/next barrel
kind: work
state: planned
created: 2026-11-20
project: CS-389
touches: [packages/next/src/index.ts, packages/next/src/**, packages/next/bench/suite/**, packages/next/test, packages/next/api/surface.txt, packages/next/scripts/checkBundle.mjs]
---

The `@cesium/next` barrel (`src/index.ts`) pulls in every optional subsystem at load: b-rep, the transform graph, georeference, measure and engineering. CS-706 measured the dev server's module load growing from 123 ms to 475 ms, 35% of the cold start's growth. Loading those subsystems only when a page uses them should recover most of it.

Source: the owner's answer to CS-714 (A, file both items), 2026-11-20. Why now: the cold start is 1.26 s against a 500 ms goal. Rough size: medium. Decider: the executor for how each subsystem loads. Removing or renaming a public export, or changing an entry point's dependency rule (`test/importBoundary.test.ts`), comes back as a question. Filed: 2026-11-20.

## Done when

- A page that uses none of the optional subsystems loads none of their modules. A test lists the modules the core entry pulls in and fails when an optional subsystem joins them.
- Cesium IR loads lazily too. Since CS-53, `src/transform` imports Cesium IR's AD, builder and scalarize modules, which raised the viewer's startup modules from 492 to 501 (run 2026-11-21T16-10-32-739Z-mac-apple). Only content under a curvilinear map compiles routes, so a default view loads none of Cesium IR. (Added 2026-11-21, from orch-11's cold-start check after CS-53. The owner moved this ahead as CS-794, so it's done here once CS-794 lands.)
- The public API keeps its names: `npm run surface` shows no removal, and `api/surface.txt` is committed with any change.
- The coldstart Dyno run measures module load before and after, with run IDs cited, and the regression budget in `bench/suite/coldStart.mjs` tightens to what is measured, with headroom stated.
- `scripts/checkBundle.mjs` and the library build still pass.
- Run on a server of the executor's own, never the owner's 5190 or 5199.
