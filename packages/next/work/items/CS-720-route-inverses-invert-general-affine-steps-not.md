---
id: CS-720
title: Route inverses invert general affine steps, not only rigid ones
kind: work
state: in-progress
created: 2026-11-19
project: CS-17
needs: [CS-719, CS-712]
claimed_by: orch-10-CS-720
touches: [packages/next/src/camera/route.ts, packages/next/src/frames/curvilinearMaps.ts, packages/next/src/scene/world/clips.ts, packages/next/test/**]
---

The owner, 2026-11-19, answering CS-719 with A: "go implement cs-719". CS-712 renamed route steps from "rigid" to "affine", but `routeInverse` (`src/camera/route.ts`) still inverts each step with `invertRigid`, which assumes rotation plus translation. So a route through an affine edge that scales or shears inverts wrongly. `src/frames/curvilinearMaps.ts` has its own `routeInverse`, and `src/scene/world/clips.ts` has its own `invertRigid`: check whether they take affine matrices too.

## Done when

- `routeInverse` inverts general affine steps. `invertRigid` stays for matrices known to be rigid, where it's cheaper and exact.
- A test routes a point up and back through an affine edge that scales unevenly and shears. It comes back to within 1 nm (float64), and it fails on the old code.
- Every other caller of `invertRigid` either takes only rigid matrices, said in a comment, or moves to the general inverse with its own test.
- A route through a singular affine edge (zero scale) throws a clear error instead of returning NaN.
- Focused tests, both type checks, and the full suite once.
