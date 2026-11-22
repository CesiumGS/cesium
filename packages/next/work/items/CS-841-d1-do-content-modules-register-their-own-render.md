---
id: CS-841
title: "D1: do content modules register their own render passes?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: B
answered_at: 2026-11-22T05:06:59.374Z
answered_via: question-tool
answered_by: owner
---

## Question

Can content modules register their own render passes? Today passes are fixed in `buildViewFrame` (`render/view/viewFrame.ts:161`). Splats, globe imagery and points need a way in.

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Inside the engine first: `RenderFeature` in named slots, used by first-party modules from alpha.1. Outside modules get it in the experimental tier after the API review. (cost: outside modules wait.)
- B. Public from alpha.1: outside modules register passes from the start. (cost: the contract freezes with only first-party users.)
- C. No registration: each new primitive is built into the renderer. (cost: every primitive changes core.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: B: public from alpha.1. Outside modules can register passes from the start.
