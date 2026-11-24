---
id: CS-218
title: The orthographic camera, `fitBounds` and the dolly between projections
kind: work
state: planned
created: 2026-11-13
project: CS-188
needs: [CS-1117]
---

## Done when

The plan's Tasks 14 to 16 and their tests pass.

## Plan

`docs/superpowers/plans/2026-11-08-frames-5d-controllers-and-animation.md`, Tasks 14 to 16.

## Note (2026-11-23)

The owner moved this into alpha.1, and slimmed it: the orthographic camera is a projective-matrix constructor on the camera record (CS-1117). `fitBounds` and the dolly between projections move to `@cesium/navigation` (CS-1124, CS-1123 A).

On 2026-11-23 it needs CS-1117 in place of CS-216: once slimmed to a constructor on the camera record, it no longer waits on the live rigs' transitions, which were for the dolly that moved to `@cesium/navigation`.
