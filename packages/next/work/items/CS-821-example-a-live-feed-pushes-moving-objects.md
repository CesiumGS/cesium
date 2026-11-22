---
id: CS-821
title: "Example: a live feed pushes moving objects through a custom streaming source"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-560]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

A custom streaming source pushes moving objects (aircraft, vehicles or sensor readings) from a recorded fixture, replayed over a local socket. The objects share the core's tile and memory budget.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Updates arrive by push, not by polling, through CS-552's push contract.
- The page shows the feed's rate and the budget it uses, and pausing the feed stops the updates cleanly.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
