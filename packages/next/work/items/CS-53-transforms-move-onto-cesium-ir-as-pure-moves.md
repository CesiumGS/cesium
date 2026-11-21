---
id: CS-53
title: Transforms move onto Cesium IR, as pure moves
kind: work
state: done
created: 2026-11-13
project: CS-10
needs: [CS-48, CS-50, CS-51]
claimed_by: orch-11-CS-53
touches: [packages/next/src/ir/**, packages/next/src/transform/**, packages/next/src/transforms/**]
---

Transforms move onto Cesium IR, as pure moves. Needs CS-48, CS-50 and CS-51.

## Done when

- Every transform test passes unchanged.
- The golden fixtures match: listings up to renumbering, evaluator outputs bit for bit, compiled WGSL byte for byte or with every difference explained in the commit.
- The browser parity suites show no pixel change against the commit before CS-53 and against a base commit.
- `ir.ts` is gone.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
