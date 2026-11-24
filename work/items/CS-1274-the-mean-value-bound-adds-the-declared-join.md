---
id: CS-1274
title: The mean-value bound adds the declared join tolerance, and GLSL's d<n> declarations are checked
kind: work
state: proposed
created: 2026-11-24
project: CS-10
needs: [CS-56]
---

> **Proposal.** Source: CS-56's review, relayed by orch-11 (2026-11-24). Why: the mean-value bound assumes exact continuity at row joins, but rows join within a declared tolerance (1 µm today). The naga test checks WGSL's declarations, but nothing checks GLSL's `d<n>` declarations. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- The bound adds the declared join tolerance to ρ at each join a box crosses, or the documentation states that it doesn't, with the size of the gap.
- A test checks GLSL's `d<n>` declarations as the naga test checks WGSL's.
