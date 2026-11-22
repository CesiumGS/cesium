---
id: CS-822
title: "Example: your imagery, your servers: WMTS, OGC API Tiles and STAC layered, with token renewal and a proxy"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-810, CS-809, CS-279]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

WMTS, OGC API Tiles and a STAC scene (from Planetary Computer, say) are layered on one globe and can be switched. A mock server answers 401, and the credential provider renews the token without reloading. An optional proxy hop shows 1.x-style proxying.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- Each source's credits show, per tile where the source gives them.
- The 401 renewal and the proxy are visible in a small request log that never shows a token or header value.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
