---
id: CS-543
title: CS-48's formula cases checked against the whole KHR_interactivity spec
kind: work
state: planned
created: 2026-11-15
project: CS-10
touches: [packages/next/src/ir/**, packages/next/test/ir.test.ts, packages/next/test/irSpike.test.ts]
tier_override: 3
---

CS-48 (the core of Cesium IR) passed the merge queue on 2026-11-16, but its executor read only about the first 100,000 of the KHR_interactivity spec's 251,000 characters. Its conformance cases marked "formula" were written from that part. The plan makes the spec's math nodes normative "with the spec's exact formulas" (`docs/superpowers/plans/2026-11-13-cesium-ir.md`, the vocabulary), so the owner held CS-48's merge until they're checked. Tier 3 by the owner's override: the spec alone is about 60,000 tokens.

Work on CS-48's branch (`hitld/CS-48-…`), before it merges: CS-48 merges with this.

## Done when

- Every op in the IR's vocabulary has its formula checked against the spec's text for that node, read in full: the math and type nodes the plan names (`mix` as `(1 - c) a + c b`, `clamp` with reversed bounds, `smoothStep`'s rising ramp, `rem` truncated, `round` half away from zero) and the rest the vocabulary uses. The report lists each node with the spec section read.
- Each conformance case marked "formula" matches the spec, or is fixed to match, with the spec's words cited beside any case that changed.
- The spec's parts that weren't needed are named in the report, so what was read and what wasn't is plain.
- The full suite passes.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its vocabulary and CS-48's row in the milestone table.
