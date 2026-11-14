---
id: CS-111
title: 'The probe and `thread: "auto"`'
kind: work
status: Planned
created: 2026-11-13
project: CS-13
milestone: the façade
needs: [CS-110]
---

The probe and `thread: "auto"`.

## Done when

Tests (fake worker): a worker that can't start, no `navigator.gpu`, no adapter, no context, a timeout, a cached answer that fails; the inspector shows mode and reason; forced `"worker"` rejects with the reason.

## Files

- `src/thread/probe.ts`
- `widgets/inspector.ts`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
