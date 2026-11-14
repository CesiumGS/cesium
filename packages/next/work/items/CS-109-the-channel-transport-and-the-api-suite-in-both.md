---
id: CS-109
title: The channel transport, and the API suite in both modes
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: the façade
needs: [CS-108]
---

The channel transport, and the API suite in both modes.

## Done when

`npm test` runs the API suite in both modes, and both pass; a test that passes a closure or a DOM object fails in `channel` with the façade's diagnostic.

## Files

- `src/thread/transport.ts`
- `vitest.config.ts`
- `test/api/**`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
