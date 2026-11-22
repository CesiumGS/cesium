---
id: CS-825
title: "Example: vector features stream from PostGIS by view, styled and picked"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-560, CS-663]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

Vector features stream from a PostGIS database by view: as the camera moves, the source asks for what's in view at the right detail, then styles and draws it, and picking returns the feature's attributes. The data is a small fixture database run locally for the example, with no outside service.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Requests follow the view and the shared budget, and the page shows features in view and requests in flight.
- Picking shows the feature's attributes and stable ID (CS-815).
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
