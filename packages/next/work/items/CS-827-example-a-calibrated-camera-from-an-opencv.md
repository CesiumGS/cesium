---
id: CS-827
title: "Example: a calibrated camera from an OpenCV calibration, overlaid on its reference photo"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-814]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

A camera built from an OpenCV calibration, with off-center intrinsics, overlaid on a reference photo of the same view, so the reprojection error can be seen. Fisheye joins once its distortion model is built.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- The page shows the calibration's numbers and the measured error in pixels.
- A model that isn't built yet is refused by name, not approximated silently.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
