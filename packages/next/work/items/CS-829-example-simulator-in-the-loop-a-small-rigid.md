---
id: CS-829
title: "Example: simulator in the loop, a small rigid-body sim writing timed poses and replaying identically"
kind: work
state: planned
created: 2026-11-21
project: CS-628
needs: [CS-816]
touches: [packages/next/examples/**, packages/next/bench/suite/catalog/**, packages/next/test]
---

A small rigid-body simulation, written in plain TypeScript in the example so there's no new dependency, drops boxes onto terrain. It writes timed poses into the engine each step, then replays the same steps and gets matching frames.

Source: the owner, 2026-11-21: "plan some examples that will exercise the new capabilities we just sketched out, and plan them for beta.1." Why now: an example is how each seam proves it works from outside the engine. Rough size: small to medium. Decider: the executor, within the example's story. Filed: 2026-11-21.

## Done when

- The replay's frames match the first run's on one machine, and the page says how that's checked.
- When CS-676's physics shapes exist, a follow-up swaps in the engine's own collision shapes. Until then the sim uses boxes and a height sample.
- It uses the public API only. Anything it has to reach past is recorded for the API review.
- It meets the UI quality bar in packages/next/AGENTS.md:
  - a `DESIGN.md` covering its story, audience and layout;
  - a UX review on the real page;
  - both themes, 380 px wide, keyboard only, reduced motion and a clean console.
- It takes its ion token from Dyno's token setting, and never writes one into code, URLs, logs or builds.
- It runs on the executor's own server, never the owner's 5190 or 5199.
