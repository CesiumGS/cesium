---
id: CS-1270
title: "A 1.x compatibility layer: 1.x's public API over 2.0"
kind: project
state: proposed
created: 2026-11-24
---

## Summary

> **Proposal.** The owner, 2026-11-24: "i think we also need a 1.x compatibility layer over this". Asked what it covers, the owner chose 1.x's public API, and asked for a decision first, then this project. Filed 2026-11-24.

A layer that runs 1.x's public API (`Viewer`, `Cesium3DTileset`, `Entity` and its data sources, the terrain and imagery providers, and the rest) over 2.0's public API, so a 1.x application can run on 2.0.

This reopens part of the owner's call of 2026-11-17 (`docs/decisions/2026-11-17-release-plan-and-parity.md`), which dropped "a runtime Entity compatibility layer, for now" in favor of the agent-first migration kit (CS-622). CS-1271 settles how the two relate, how the layer is packaged, what counts as compatible and when it lands. The design item is filed once CS-1271 is answered.

Starting points: `handbook/src/apiMap.ts` (the tested 1.x-to-2.0 map), the migration kit (CS-622), the API review (CS-102), and the 2026-11-08 note that "any compatibility layer" for Entity belongs to the vector design and the API review (`docs/decisions/2026-11-08-owners-calls-for-later-plans.md`).
