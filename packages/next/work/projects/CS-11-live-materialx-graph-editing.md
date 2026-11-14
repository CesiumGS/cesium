---
id: CS-11
title: Live MaterialX graph editing
kind: project
status: Planned
created: 2026-11-13
initiative: CS-2
lead: owner
plan: docs/superpowers/plans/2026-11-13-materialx-live-graph.md
---

## Summary

`docs/superpowers/plans/2026-11-13-materialx-live-graph.md`, reviewed by the owner on 2026-11-13. A gallery example: a MaterialX graph edited live on a lookdev stage, four city places and seven terrain places. MaterialX stays at the edge (`packages/next/materialx/`, never imported by `src/`). At review: no pre-IR emitter (the lowering is CS-63), noise first in Cesium IR's gap order, and our own XML reader with a generated definitions table. No durations: order and dependencies only.
