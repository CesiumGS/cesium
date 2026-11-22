---
id: CS-828
title: "Example: what is this? Stable IDs and semantic labels on a city, with a segmentation view"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-815]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

Hovering a 3D Tiles city shows each feature's stable ID and its labels by taxonomy, beside a semantic-segmentation view. Reloading the content in a different order gives the same IDs.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- The page shows which taxonomy each label comes from.
- The reload check is a button anyone can press, with the result in words.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
