---
id: CS-552
title: "The content-source seam: one interface every source module implements, designed and planned"
kind: work
state: planned
created: 2026-11-16
project: CS-191
tier_override: 3
needs: [CS-551]
---

Design the content-source seam that the owner's call (CS-551, `docs/decisions/2026-11-16-content-sources-as-modules.md`) asks for: one interface every source module implements, so 3D Tiles, the globe's terrain and imagery, glTF files, MVT, Esri services, USD and later sources load the same way. This is the design-heavy step the source items (CS-554 to CS-559) wait on.

Start from what's written: `docs/design/modular-renderer.md` (the tiers, the `@cesium/next/tiles` entry point, the open questions), `docs/design/ion-as-a-module.md` (ion's content-source interface, CS-269), `docs/design/layers-engine-renderer-backend.md`, the streaming code (`src/streaming/`) and the globe's sources (`src/globe/`).

## Done when

- Its interface leaves room for CS-831's write path: a capability declaration, an override contract and a change-set type. (Added 2026-11-21.)
- It also covers, from the owner's review of 2.0's seams on 2026-11-21:
  - push updates, so live feeds (SensorThings, digital-twin telemetry) don't have to be polled;
  - render passes registered by modules, so splats and other new content can draw;
  - superseding `docs/design/modular-renderer.md`, whose "don't introduce a module system… yet" no longer holds;
  - room for CS-806's outside tiling engine and CS-818's catalog seam.
- A design note in `docs/design/` names the interface: what a source provides (selection, requests, decode, what it hands the renderer), how styling binds to it, how it runs on Jobs and in worker mode, and how ion and other hosts supply content through it.
- It says how each named source fits, the globe's terrain and imagery included, and what each needs that 3D Tiles doesn't.
- It settles, or raises as decisions for the owner, the questions it leaves open: whether renderer passes register, how it relates to scene items and "the globe as an item" (CS-454), and ion's interface (CS-269).
- A plan in `docs/superpowers/plans/` with a milestone table turns CS-554 to CS-559 into planned items, each with its "Done when".
- The owner has reviewed the design and the plan.
