---
id: CS-617
title: 2.0 splits into scoped packages, released in lockstep, with cesium@2 as the umbrella
kind: work
state: planned
created: 2026-11-17
project: CS-615
needs: [CS-616, CS-310]
---

## Done when

- Each first-party part is a scoped package at one shared version, and `cesium@2` depends on the standard set and re-exports it.
- The module seams and `test/importBoundary.test.ts` draw the package lines.

From the owner's release planning on 2026-11-17: `docs/decisions/2026-11-17-release-plan-and-parity.md`.
