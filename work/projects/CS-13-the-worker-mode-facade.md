---
id: CS-13
title: The worker-mode façade
kind: project
state: planned
created: 2026-11-13
owner: owner
plan: docs/superpowers/plans/2026-11-13-worker-facade.md
---

## Summary

`docs/superpowers/plans/2026-11-13-worker-facade.md`, reviewed by the owner on 2026-11-13 (`docs/decisions/2026-11-13-architecture-decisions.md`, threading, `docs/design/job-system.md`). One API on the main thread; the engine on the main thread or in a worker, chosen by a probe (`thread: "auto" | "main" | "worker"`). Commands, per-tick snapshots, queries as promises; user code the engine runs is a Cesium IR program, a self-contained function or a module; HTML overlays are the app's (the engine publishes tracked points). Sequenced with the public API review (CS-102): CS-101's map first, then the review, then CS-103 to CS-107. No durations: order and dependencies only.
