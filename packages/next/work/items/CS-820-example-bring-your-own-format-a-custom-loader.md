---
id: CS-820
title: "Example: bring your own format, a custom loader registered and used from the public API"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-560]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

A custom format loader, about 100 lines in the example itself, turns a simple file (a CSV of points, say) into meshes. The page registers the loader and loads a file with it. It shows that the format-loader registry is open, and that 3D Tiles and glTF are only two loaders among many.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- The loader is written in the example, not in the engine, and it loads in a worker the way the built-in loaders do.
- Swapping the loader, or loading a file no loader claims, shows a clear message.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
