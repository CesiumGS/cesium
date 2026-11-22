---
id: CS-771
title: The seam bypass tests catch the five plants CS-430's audit found passing
kind: work
state: proposed
created: 2026-11-20
project: CS-437
needs: [CS-430]
touches: [packages/next/test/seams.test.ts, packages/next/test/importBoundary.test.ts, packages/next/test/*Seam*.test.ts, packages/next/test]
---

CS-430's audit (`docs/design/webgpu-seams-audit.md`) planted a bypass against each seam's test. Five plants passed when they should have failed:

- a GPU type in `src/scene/renderSeam.ts`;
- a render import in `Camera.ts`;
- `castTerrainRay` exported from `widgets/index.ts`;
- a property-texture read in `surface.slang`;
- a capability read in `World.ts`.

This item changes tests only.

**Proposal** (CS-686). Source: CS-430's report, relayed by orch-11, 2026-11-20. Why now: a seam whose test misses a bypass guards nothing, and CS-35 (the WebGL 2 device) and CS-34 lean on these seams next. Rough size: small. Decider: the executor, within tests. A test that fails on main as it is today comes back as a question naming the line, and is not fixed in engine code here. Filed: 2026-11-20.

## Done when

- Each of the five plants fails its test, naming the file and line. The plants are listed in the commit message and none is committed.
- The fixes are the ones CS-430 names: the ray scan is widened, the bindless detector also covers property textures, the capability lists are derived from types instead of written out by hand, and the single `DrawConstants.write` site is pinned.
- Every seam test still passes on main. If one doesn't, it is reported, not changed.
