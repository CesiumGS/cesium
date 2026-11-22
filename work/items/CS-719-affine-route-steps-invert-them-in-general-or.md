---
id: CS-719
title: "Affine route steps: invert them in general, or keep rigid-only"
kind: decision
state: done
created: 2026-11-19
project: CS-17
decider: owner
answer: "A. Invert general affine: A small follow-up item makes routeInverse invert general affine matrices, with a test through a scaling edge, and keeps invertRigid for true rigid matrices."
answered_at: 2026-11-20T03:15:31.857Z
answered_via: main-session
answered_by: owner
---

## Question

Route steps are now called affine and their matrices may scale, but routeInverse still inverts them with invertRigid, which assumes no scale: should routeInverse invert general affine matrices, or should the rigid-only guarantee be kept and documented?

CS-712 renamed route steps from "rigid" to "affine" to match AffineEdge, as a pure rename with no behavior change. Its executor noticed that routeInverse still calls invertRigid (rotation plus translation only), so a route through a scaling affine edge would invert wrongly; old and new code behave the same. Nothing in the run depends on it.

Rule basis: novelty. Reversibility: two-way.

## Options and recommendation

- A. Invert general affine: A small follow-up item makes routeInverse invert general affine matrices, with a test through a scaling edge, and keeps invertRigid for true rigid matrices. (cost: A small engine item; a general 4x4 affine inverse where a rigid one was.)
- B. Keep and document rigid-only: A follow-up item documents that route steps must be rigid for routeInverse and makes it throw on a scaling step. (cost: Scaling affine edges can't be inverted through a route.)
- C. Not now: Nothing changes; a route through a scaling affine edge inverts wrongly, as today.

Recommended: Invert general affine. The name now promises affine steps, and a correct general inverse is small; throwing would make the new name a half-truth.

If unanswered by 2026-11-23T12:00:00Z: Not now.

## Answer

Recorded in the front matter once answered.
