---
id: CS-823
title: "Example: offline coordinates, with PROJ grids from a local bundle, HTTP or ion giving the same answer"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-808]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

A PROJ conversion and a geoid height computed from grids that come from a local bundle, plain HTTP or ion, switched live, each giving the same answer to the stated precision.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Each provider's data is checked against its pin, and a corrupted grid is refused with its name.
- The page states the datums and units of every number it shows.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
