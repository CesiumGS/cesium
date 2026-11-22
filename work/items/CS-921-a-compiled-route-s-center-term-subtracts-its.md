---
id: CS-921
title: A compiled route's center term subtracts its highs as integers on both emitters
kind: work
state: done
created: 2026-11-22
project: CS-10
needs: [CS-54]
claimed_by: orch-11-CS-921
---

> **Committed by the owner (2026-11-22, for alpha.1).** Source: CS-54's executor (2026-11-22). Why: a real accuracy loss in the shipping viewer. Under relaxed math on Apple GPUs, a compiled route's center term (`tgCenter`) loses df64's low halves. That costs 0.1 to 0.3 m at the Earth's surface on WebGPU for separable routes (vertical exaggeration, flatten), and down to float32 precision on WebGL 2. CS-54 bounded the term at what it measured and documented why. Size: medium. Filed 2026-11-22.

## Done when

- A compiled route's center term subtracts its high parts as integers on both emitters, so relaxed math can't drop the low parts.
- The error at the Earth's surface is measured on WebGPU and WebGL 2, before and after, on Apple GPUs and at least one other vendor where available. Units and the measured spread are stated.
- The goldens are regenerated, and the parity suites run against the previous commit and a base. Every pixel difference is explained.
