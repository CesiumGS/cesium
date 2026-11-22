---
id: CS-370
title: Scene rebuild after a WebGL 2 context loss
kind: work
state: proposed
created: 2026-11-13
project: CS-9
needs: [CS-113, CS-36]
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, section 6, made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. It also waits on CS-113, CS-36. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

The WebGL 2 device rebuilds its scene from the CPU after a context loss, as CS-113 does for WebGPU ("later for both devices").

## Plan

`docs/superpowers/plans/2026-11-13-webgl2-renderer.md`, section 6.
