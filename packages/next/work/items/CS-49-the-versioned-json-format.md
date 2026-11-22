---
id: CS-49
title: The versioned JSON format
kind: work
state: in-progress
created: 2026-11-13
project: CS-10
needs: [CS-48]
claimed_by: orch-11-CS-49
touches: [packages/next/src/ir/**]
---

The versioned JSON format. Needs CS-48.

## Done when

- Every program in the test suite round-trips through JSON to the same shape key.
- Malformed files are refused with the right message (fixtures: unknown major, unlisted extension, forward reference, type mismatch).
- The schema validates every fixture.

## Plan

`docs/superpowers/plans/2026-11-13-cesium-ir.md`, its milestone table.
