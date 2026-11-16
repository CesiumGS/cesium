---
id: CS-136
title: `converged()`, replacing `whenReady`
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-135]
touches: [packages/next/src/scene/converged.ts, packages/next/src/scene/engineReady.ts, packages/next/test/engineReady.test.ts, packages/next/src/converged.test.ts]
---

`converged()`, replacing `whenReady`. Needs CS-135.

## Done when

Tests: resolves only after a frame showing the state; already converged resolves on the next tick; timeout reports `pending` and `changing`; abort rejects; `within` cuts; failures counted.

## Plan

`docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
