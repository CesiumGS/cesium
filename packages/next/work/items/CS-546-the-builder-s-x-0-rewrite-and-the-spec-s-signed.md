---
id: CS-546
title: The builder's x + 0 rewrite and the spec's signed zero
kind: decision
state: planned
created: 2026-11-15
project: CS-10
decider: owner
---

## Question

The builder rewrites x + 0 to x, as the plan says, but for x = -0 the spec's math/add gives +0. Which rule should the builder follow?

CS-543 checked CS-48's formulas against the whole KHR_interactivity spec. It fixed three sign-of-zero mismatches (dot, intToFloat, and x - (-0)), each with a new case quoting the spec, and the full suite passes. It left this one alone because the plan names the rewrite. Under math/add's IEEE sum, -0 + (+0) is +0, so rewriting x + 0 to x returns -0 where the spec returns +0. Adding -0 is exact for every x, including -0. CS-48's own code comment already notes the change of sign. CS-48 can merge either way; this is a small change to src/ir/builder.ts and the plan's wording.

Rule basis: conflicting-evidence. Reversibility: two-way.

## Options and recommendation

- A. A: Rewrite only x + (-0): The builder rewrites x + c to x only when c is -0, which matches the spec for every x, and the plan's wording is amended to say so. It lands as a small follow-up item after CS-48 merges. (cost: One small item, at tier 1 or 2.)
- B. B: Keep x + 0 as the plan says: No code change. The plan says the builder's x + 0 rewrite may turn -0 into +0, a known gap from the spec's add. (cost: Nothing now; builder output disagrees with the spec when x is -0.)
- C. C: Drop the x + 0 rewrite: The builder never simplifies an addition of zero, and the plan drops the rewrite. (cost: One small item; programs that add a constant zero keep the add.)

Recommended: A: Rewrite only x + (-0). It keeps the simplification the plan wants and is exact under the spec's math/add for every x, the same shape as the x - (+0) fix CS-543 made.

If unanswered by 2026-11-19T17:00:00.000Z: A: Rewrite only x + (-0).

## Answer

Recorded in the front matter once answered.
