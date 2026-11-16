---
id: CS-136
title: `converged()`, replacing `whenReady`
kind: work
state: planned
created: 2026-11-13
project: CS-15
needs: [CS-135]
---

`converged()`, replacing `whenReady`. Needs CS-135.

## Done when

Tests: resolves only after a frame showing the state; already converged resolves on the next tick; timeout reports `pending` and `changing`; abort rejects; `within` cuts; failures counted.

## Files

- `src/scene/converged.ts`
- `src/scene/engineReady.ts`
- `test/engineReady.test.ts`
- `src/converged.test.ts`

Detail: `docs/superpowers/plans/2026-11-13-refinement-and-convergence.md`, its milestone table.
