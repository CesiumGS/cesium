---
id: CS-571
title: The IR builder rewrites x + c to x only when c is -0, as the spec's math/add requires
kind: work
state: planned
created: 2026-11-17
project: CS-10
needs: [CS-546]
touches: [packages/next/src/ir/builder.ts, packages/next/test/ir.test.ts, docs/superpowers/plans/2026-11-13-cesium-ir.md]
tier_override: 1
---

The owner answered CS-546 with A: the IR builder's `x + 0` rewrite returns -0 for `x = -0`, where the KHR_interactivity spec's `math/add` gives +0, so the builder rewrites `x + c` to `x` only when `c` is -0, which is exact for every `x`. The same shape as CS-543's `x - (+0)` fix.

## Done when

- `src/ir/builder.ts` rewrites `x + c` to `x` only when `c` is -0, and keeps the add when `c` is +0.
- A case in `test/ir.test.ts` checks `x = -0` against the spec's `math/add`, quoting it, and fails if the old rewrite comes back.
- The plan's wording on the rewrite (`docs/superpowers/plans/2026-11-13-cesium-ir.md`) says the same.
- The full suite passes.
