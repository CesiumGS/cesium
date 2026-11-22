---
id: CS-941
title: A compiled route's residual statements go through Cesium IR's emitters (CS-920 B)
kind: work
state: planned
created: 2026-11-22
project: CS-10
needs: [CS-54]
---

> **Committed by the owner (2026-11-22), through CS-920's answer B: now, not with CS-56.**

## Done when

- A compiled route's residual statements go through Cesium IR's emitters on both WebGPU and WebGL 2. The two-language residual rules are removed.
- CS-53's reference files are regenerated, and the change in each one is explained.
- The Lab's irWgsl and irGlsl run before and after, read from their `pass` fields, and parity on tracks and heights runs with a separate checkout per side.
- CS-54's 0.1 mm corridor bound still holds on the GPU.
