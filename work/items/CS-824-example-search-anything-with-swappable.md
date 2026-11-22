---
id: CS-824
title: "Example: search anything, with swappable geocoders and a catalog search for the view"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-587]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

One search box backed by two geocoders, swapped live, so an app can bring its own service. If the owner commits CS-818 (the catalog seam), a second tab finds STAC assets for the current view.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Results fly the camera to the place, and a service error is shown, never swallowed.
- The geocoder runs without React, through the plain interface CS-587 adds.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
