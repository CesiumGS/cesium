---
id: CS-791
title: Per-draw center constants on Cesium IR's generic evaluator are measured against the old Float64Array loop
kind: work
state: proposed
created: 2026-11-21
project: CS-10
needs: [CS-53]
touches: [packages/next/bench/**, packages/next/src/transform/**, packages/next/src/ir/**]
---

CS-53 replaced the per-draw center constants' Float64Array loop with Cesium IR's generic evaluator. The numbers are pinned bit for bit, but the cost per draw wasn't measured.

**Proposal** (CS-686). Source: CS-53's report, relayed by orch-11, 2026-11-21. Why now: per-draw constants run every tick for every draw, so a slower evaluator costs time in every scene. Rough size: small. Decider: the executor. If the generic evaluator is clearly slower, a fix comes back as a proposal with the numbers, not in this item. Filed: 2026-11-21.

## Done when

- A Dyno measurement compares the per-draw center constants on main against the commit before CS-53, on the same scenes and draw counts, with run IDs cited and noise stated.
- The result says faster, slower or can't tell, per scene. "Can't tell" is an acceptable answer.
