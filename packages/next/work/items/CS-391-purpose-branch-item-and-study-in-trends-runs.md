---
id: CS-391
title: Purpose, branch, item and study in Trends, Runs, Compare and Alerts
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

Trends defaults to baseline runs and gains purpose, branch and item filters. Runs gains the columns and filters. A run's page shows its identity. Compare gets its "this branch against its base" default. Alerts work on baseline runs only.

## Done when

With a store holding baseline runs and dev runs from two branches, Trends draws only the baseline runs until asked. Compare opened from a branch picks the branch's newest run against the baseline run at its base, and says so. Change-point tests show dev runs don't move alerts. Owner review.

## Files

`views/Trends.tsx`, `trendsModel.ts`, `Runs.tsx`, `runParts.tsx`, `Compare.tsx`, `Report.tsx`, `Alerts.tsx`, `changepoints.mjs`, `routes.tsx`

## Plan

`docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
