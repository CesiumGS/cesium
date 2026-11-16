---
id: CS-59
title: The writer and reader for `KHR_interactivity`'s graph JSON (vendor extension `BENTLEY_interactivity_ir`)
kind: work
state: planned
created: 2026-11-13
project: CS-10
needs: [CS-49]
---

The writer and reader for `KHR_interactivity`'s graph JSON (vendor extension `BENTLEY_interactivity_ir`), for everything but tables. Needs CS-49. Tables in the graph JSON are CS-60, split out because only they wait for CS-56.

## Done when

- Every test program round-trips Cesium IR → KHR JSON → Cesium IR to the same shape key and the same literal values.
- The written files validate against `KHR_interactivity`'s JSON schemas.
- A file using a flow node is refused with its node index named.

## Files

- `src/ir/`

Detail: `docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
