---
id: CS-12
title: The job system's ports
kind: project
state: planned
created: 2026-11-13
owner: owner
plan: docs/design/job-system.md
---

## Summary

The first slice is merged: `Jobs` behind `WorkerPool` (priorities, dependencies, cancellation, a budgeted apply phase), shared memory when the page is cross-origin isolated, terrain decode completion and the refit fallback on it. No durations: order and dependencies only.

The design is `docs/design/job-system.md`. The owner's decisions after review (`docs/design/job-system.md`): app jobs yes, narrowly, later; the inspector's Jobs section; the ports move existing work onto `Jobs`, each declaring its refinement hold when it lands.
