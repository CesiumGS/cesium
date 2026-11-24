---
id: CS-279
title: More terrain and imagery providers, and several imagery layers on one globe
kind: work
state: planned
created: 2026-11-13
project: CS-191
needs: [CS-810]
tier_override: 1
---

## Done when

Providers chosen from demand, each an optional module (ArcGIS, WMS, WMTS, TMS imagery; other terrain formats; terrain as 3D Tiles), and a globe that takes more than one imagery layer.

Detail: `docs/design/ion-as-a-module.md`, "Two layers, not one"; `packages/next/handbook/src/apiMap.ts`.

Committed by the owner's release plan on 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`).

The owner, 2026-11-17: probably all of 1.x's terrain and imagery providers, each a module through one common interface into core.

Added 2026-11-24 from a host application's need, which the owner moved to tier 1 with CS-810, CS-661, CS-557, CS-558 and CS-656: Google's and Azure's 2D map tiles are among the providers, each with renewable credentials through CS-810's seam.
