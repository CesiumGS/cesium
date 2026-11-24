---
id: CS-1175
title: "milk-truck-fleet's GPU time per frame: where 600 ms goes in 100,000 instanced trucks"
kind: work
state: proposed
created: 2026-11-23
project: CS-198
---

> **Proposal** (CS-686). Source: CS-1152's proof runs, via orch-11. Why now: 2.0 spends about 600 ms of GPU time per frame on milk-truck-fleet, even GPU-paced (run 2026-11-24T02-58-14-658Z-mac-apple), so the scene is unusable and its uncapped orbit lost the WebGPU device. Rough size: medium (a profile first; the fix depends on what it finds). Decider: owner. Filed: 2026-11-23.

## Done when

- A GPU profile of milk-truck-fleet says where the time per frame goes (vertex work, culling, overdraw, translucency, shadows or other passes), cited by Dyno run IDs.
- The cause is named, and either fixed with a before-and-after GPU-paced run, or filed as its own items.
- Related: CS-38 (lighting and instancing, in the WebGL 2 renderer).
