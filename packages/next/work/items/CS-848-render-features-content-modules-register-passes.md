---
id: CS-848
title: "Render features: content modules register passes in named slots, declared for picks, rays and shadows"
kind: work
state: planned
created: 2026-11-21
project: CS-191
needs: [CS-847, CS-841]
touches: [packages/next/src/render/view/viewFrame.ts, packages/next/src/render/features/**, packages/next/test/seams.test.ts, packages/next/src/index.ts, packages/next/api/surface.txt]
---

Content modules register their own render passes in named slots, declared for picks, rays and shadows. The owner chose to make this public from alpha.1 (CS-841, B), rather than internal-first.

From CS-552's design and plan (`docs/design/content-source-seam.md`; `docs/superpowers/plans/2026-11-21-content-source-seam.md`, section 3.2), filed by the chief of staff with the owner's answers to D1 to D6 (CS-841 to CS-846). Rough size: medium. Decider: the executor, within the plan. Filed: 2026-11-21.

## Done when

- A `RenderFeature` registers its passes in named slots (`opaque`, `translucent`, `ground`, `overlay`, and the post slots), each declaring what it reads and writes. Pass order still comes from one function, `buildViewFrame`.
- Each feature declares whether it writes IDs, gives a ray adapter and casts shadows. A test fails on a feature that declares none of the three, so no default is silent.
- A sample feature on the fake device draws custom rows in the `translucent` slot, depth-tested against a mesh.
- It's public from alpha.1 (the owner's answer to D1, CS-841): `RenderFeature` and its slots are exported and documented. Outside modules can register passes. Its names go through the API review (CS-102). Tests include a feature registered from a test module outside `src/`.
- The seam test checks that a render feature's file is in the renderer tier, and that no source's content half imports it.
