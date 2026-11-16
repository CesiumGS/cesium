---
id: CS-22
title: Paths in one place, with the seam test
kind: work
state: planned
created: 2026-11-13
project: CS-8
needs: [CS-21]
touches: [packages/next/src/profile/**, packages/next/src/render/**, packages/next/src/scene/**]
---

Paths in one place, with the seam test. Needs CS-21.

## Done when

- The seam test passes with no exceptions for facts reads: star submission, moments format, KTX2 target, sample-rate probe and timer all go through `paths(facts)` or `effective`.
- One parity page per changed path is unchanged.

## Plan

`docs/superpowers/plans/2026-11-13-engine-profiles.md`, its milestone table.
