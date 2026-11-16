---
id: CS-48
title: The core (types, rates, equations, literal slots, the builder)
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
claimed_by: D-5
touches: [packages/next/src/ir/**]
---

The core (types, rates, equations, literal slots, the builder). Needs nothing.

## Done when

- Conformance tests built from the spec's per-op tables of ±0, ±∞ and NaN cases pass for every op implemented.
- The spike's style, twist and MaterialX programs evaluate to the spike's results.
- An import-boundary test shows `src/ir/` imports nothing outside itself.
- `checkBundle` shows the core in the main chunk, with no dependency.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
