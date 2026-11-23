---
id: CS-1106
title: Dyno refuses to start a run whose scenes need an ion token when it has none, instead of recording invalid runs
kind: work
state: proposed
created: 2026-11-23
project: CS-199
---

> **Proposal.** Source: the chief of staff, reading the two nightlies of 2026-11-23 (2026-11-23T05-45-03-152Z and 07-16-05-418Z). Why: 88 of their runs were invalid in each, and every one was "needs a Cesium ion token" (World Terrain, Bing Maps Aerial, Google Photorealistic 3D Tiles), because the clean worktree had no token. That cost two nightly windows, and the failure was first read as load. Size: small. Decider: owner. Filed 2026-11-23.

## Done when

- Before any run starts, Dyno checks whether the plan's scenes need ion and whether it has a token, from its token setting or the environment. Without one, it refuses the whole run and names the scenes, or runs only the scenes that don't need ion, with a warning in the plan.
- `dyno status` and the run summary say why each invalid run is invalid, grouped by reason.
- Nothing prints the token.
