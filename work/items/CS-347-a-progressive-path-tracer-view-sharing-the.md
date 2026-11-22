---
id: CS-347
title: A progressive path-tracer view, sharing the device's tables
kind: work
state: proposed
created: 2026-11-13
project: CS-197
needs: [CS-346]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/investigations-2026-11-13.md`; `docs/design/sky-light-and-points-unifications.md`, "Path tracing as a pluggable renderer"; `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, "Still open", made by the 2026-11-13 plan migration. Why now: Committed work needs it: it is a constraint of CS-535 (Rays query the scene on the GPU), so that milestone cannot be checked while this stays proposed. It also waits on CS-346. Rough size: large, a project of its own. Decider: the owner. Filed: 2026-11-13.

## Done when

A path-tracer view as the swap test, with the WebGPU device's tables split from its raster passes so it can share them, and accumulation as a refinement source.

Detail: `docs/design/investigations-2026-11-13.md`; `docs/design/sky-light-and-points-unifications.md`, "Path tracing as a pluggable renderer"; `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, "Still open".
