---
id: CS-111
title: 'The probe and `thread: "auto"`'
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-110]
touches: [packages/next/src/thread/probe.ts, packages/next/widgets/inspector.ts]
---

The probe and `thread: "auto"`.

## Done when

- Each probe failure falls back to the main thread with its reason: a worker that can't start, no `navigator.gpu`, no adapter, no context, a timeout, a stale cached answer (fake-worker tests).
- The inspector shows the thread mode and its reason.
- A forced `thread: "worker"` rejects with the reason.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
