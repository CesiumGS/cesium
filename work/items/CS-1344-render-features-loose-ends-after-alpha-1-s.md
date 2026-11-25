---
id: CS-1344
title: Render features' loose ends after alpha.1's review
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-848]
---

- **Source:** orch-11's reports on CS-848's review rounds (render features register passes in named slots), 2026-11-24.
- **Why now:** CS-848's scoped check found no open Important. These are its Minors and one optional point, kept so they aren't lost at the merge. None blocks alpha.1.
- **Unblocks:** a cleaner render-feature contract for the API review (CS-102).
- **Size:** small to medium. Each point is local to the render-feature code or its docs; point 4 is a budget question.
- **Decider:** the orchestrator, then the owner at shaping.

## The loose ends

1. Stages are kept by pass name across views. So per-view options rebuild and unwatch each other, and names no longer added stay watched until unregister.
2. The reads check goes by the `postDepthAt` and `postIdAt` names, so the prelude's `postDepth_0` is reachable by name. The pipeline layout has no binding for it, so it fails safe.
3. A refresh or a row change during the pre-loop asks again after a world prepared.
4. The pipeline cache grows when a feature's WGSL changes on every ask. This is a budget item.
5. A later assignment of `rows.onChange` drops every follower silently.
6. A surfaces feature's blended-only line draw can't be listed in any scene slot, though it still draws in the opaque pass. The opaque slot should allow blended lines.
7. The public docs for pass names and `FeatureDraws.addDraw` don't state the two new refusals: no "." in pass names, and lines are refused unless a feature declares ids "surfaces" and shadows "casts".
8. Optional: a feature stage's graph label can match a host stage's (`post.fx.glow` both ways). Only the GPU timer's readout and the debug group names key on it.

## Done when

- Points 1 to 7 are fixed, each with a test that fails before the fix, or are recorded as declined with a reason.
- Point 8 is fixed or recorded as declined.
- The public docs state every refusal that `FeatureDraws.addDraw` and pass names make.

## Not covered here

The ground and overlay slots (CS-1311, CS-1312), ray adapters (CS-1313) and the destroy bypass test's matching (CS-1317) have their own items.
