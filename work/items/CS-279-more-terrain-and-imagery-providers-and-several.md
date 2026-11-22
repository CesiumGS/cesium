---
id: CS-279
title: More terrain and imagery providers, and several imagery layers on one globe
kind: work
state: planned
created: 2026-11-13
project: CS-191
---

## Done when

Providers chosen from demand, each an optional module (ArcGIS, WMS, WMTS, TMS imagery; other terrain formats; terrain as 3D Tiles), and a globe that takes more than one imagery layer.

Detail: `docs/design/ion-as-a-module.md`, "Two layers, not one"; `packages/next/handbook/src/apiMap.ts`.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

The owner, 2026-11-17: probably all of 1.x's terrain and imagery providers, each a module through one common interface into core.
