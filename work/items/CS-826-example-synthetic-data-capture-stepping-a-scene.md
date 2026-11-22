---
id: CS-826
title: "Example: synthetic data capture, stepping a scene and exporting color, depth and IDs with each camera record"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-813, CS-814, CS-816]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

The engine steps a city scene in fixed ticks. Each step shows color, depth and instance IDs side by side with the frame's camera record, and a button exports a small COCO-style dataset. This is the headline physical-AI demo.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Stepping the same scene twice exports the same dataset on one machine.
- The export names its formats and units: depth in meters along the optical axis, and IDs as uint32.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
