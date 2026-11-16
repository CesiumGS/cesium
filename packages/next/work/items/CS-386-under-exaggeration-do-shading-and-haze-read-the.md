---
id: CS-386
title: Under exaggeration, do shading and haze read the drawn or the true height?
kind: decision
state: planned
created: 2026-11-13
project: CS-17
needs: [CS-385]
decider: owner
---

## Question

Not settled; the owner wants to see the spike first, and the review defers the answer to the public API review. Source: `docs/design/geometry-through-placement-review.md`, "The owner's answers (2026-11-10)", answer 2.

## Options and recommendation

- **Drawn** positions for everything.
- **True** height for everything.
- **Split (the review's recommendation):** shading (normals, shadows, light, path length) uses drawn positions; height lookups (tint, contours, thresholds, air density) use the true height.

## Answer

Open.
