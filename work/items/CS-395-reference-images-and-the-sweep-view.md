---
id: CS-395
title: Reference images and the sweep view
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-393, CS-394]
---

Captures per point. Pixel difference and FLIP against the reference point, over the whole image and crops. The noise floor from reference repetitions. The sweep view as a component (axes as lines and panels, hollow unsettled points, noise band, table twins, the image grid), shown in a sweep run's report and, until CS-405, in Analysis's Sweeps tab. Images' compare modes for any two images.

Model: the most capable one (design-heavy or risky), per the plan.

## Done when

A three-axis sweep reads as small multiples with an image grid. A point within noise says so. A click on a thumbnail opens the pair in swipe and flicker. Owner review.

## Files

`cli.mjs` (capture), new `bench/suite/reference.mjs`, new `views/SweepView.tsx`; `views/Report.tsx`, `views/Analysis.tsx`, `analysis.css`, `views/Images.tsx` (compare any pair), `charts.mjs`

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
