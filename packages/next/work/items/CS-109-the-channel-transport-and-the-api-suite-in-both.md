---
id: CS-109
title: The channel transport, and the API suite in both modes
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-108]
touches: [packages/next/src/thread/transport.ts, packages/next/vitest.config.ts, packages/next/test/api/**]
---

The channel transport, and the API suite in both modes.

## Done when

`npm test` runs the API suite in both modes, and both pass; a test that passes a closure or a DOM object fails in `channel` with the façade's diagnostic.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
