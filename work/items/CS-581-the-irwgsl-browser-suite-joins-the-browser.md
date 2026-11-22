---
id: CS-581
title: The irWgsl browser suite joins the browser-suite gate for changes under src/ir
kind: work
state: planned
created: 2026-11-17
project: CS-195
needs: [CS-575]
touches: [packages/next/bench/run.mjs]
tier_override: 2
---

The owner answered CS-575 with A on 2026-11-18: CS-51's `irWgsl` browser suite (60 GPU readback cases comparing the emitted WGSL with the float64 evaluator) joins the browser-suite gate, so every change under `src/ir` runs it. Its tolerances were tuned on Apple M2 / Metal 3 only, looser than Metal showed.

## Done when

- A change under `packages/next/src/ir/` runs `irWgsl` wherever the browser-suite gate runs, and a failing case blocks it.
- Its run ID and worst error ratio are recorded with the change's evidence.
- Where it fails on another GPU, the failure says which case and by how much, so tolerances can be revisited with data rather than loosened blind.
