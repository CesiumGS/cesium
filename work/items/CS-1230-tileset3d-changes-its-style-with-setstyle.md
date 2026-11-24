---
id: CS-1230
title: Tileset3D changes its style with setStyle
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-55]
---

> **Proposal.** Source: CS-55's review (styles move onto Cesium IR), relayed by orch-11 (2026-11-24). Why now: a tileset's style can be set only at creation today. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `Tileset3D.setStyle` applies a new style through `FeatureStyle.update`, and builds a new `FeatureStyle` when `update` returns false, with a test for each path.
