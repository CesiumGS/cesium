---
id: CS-1325
title: The IR crate grows bounded loops, the item rate and a GPU-kernel stage
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-1324, CS-1208]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.10, its item RI), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: label collision runs as an IR compute kernel (Q4: "Yes, a runtime GPU kernel (Recommended)"), and the IR has no bounded loops, item rate or kernel stage yet. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- On CS-1208's move of `FORMAT.md` and the conformance vectors into the IR crate: loops bounded by a constant, the item rate, and the string handling collision needs, each with conformance vectors, a CPU evaluator, and 2.0's emitter.
- A plan-format stage for a GPU kernel, shaped as styling-runtime.md's `GpuKernel` (reads, writes, `maxItems`, `dropped`), versioned with additive minors and refusal by name (section 8 there).
- 2.0's IR emitter writes a compute kernel from it, applying the GPU-safety rules itself (constant loop bounds, clamped indices) rather than trusting the runtime.
