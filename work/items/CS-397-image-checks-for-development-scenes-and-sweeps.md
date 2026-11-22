---
id: CS-397
title: Image checks for development scenes and sweeps
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-394, CS-395]
---

`images.mjs` runs example and Lab scenes (`checks: ["settled"]`). It takes `--sweep`, `--reference` and `--study`, and records crops. Images labels group D checks and links them to their study.

## Done when

`images --scenes vex-x10-zermatt` captures, compares against its approved image, and is reviewable. A swept image run shows as a grid.

## Files

`images.mjs`, `cli.mjs`, `views/Images.tsx`

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
