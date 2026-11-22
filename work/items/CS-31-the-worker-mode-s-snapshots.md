---
id: CS-31
title: The worker mode's snapshots
kind: work
state: planned
created: 2026-11-13
project: CS-8
needs: [CS-23, CS-99]
touches: [packages/next/src/profile/**]
---

The worker mode's snapshots. Needs CS-23 and the worker spike (`docs/design/job-system.md`).

## Done when

- The `support`, `effective` and `explain` API tests pass unchanged in both thread modes.
- `strict` throws synchronously from the snapshot.

## Plan

`docs/superpowers/plans/2026-11-13-engine-profiles.md`, its milestone table.
