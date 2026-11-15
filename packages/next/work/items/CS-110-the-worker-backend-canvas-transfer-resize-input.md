---
id: CS-110
title: The worker backend (canvas transfer, resize, input, built-in controllers)
kind: work
status: Planned
created: 2026-11-13
project: CS-13
needs: [CS-109]
---

The worker backend (canvas transfer, resize, input, built-in controllers).

## Done when

The `worker` browser suite (section 3.9) renders the same images in both modes on its three pages; the M0 smoke test passes through the façade; `checkBundle` shows the worker chunk and keeps it out of the main chunk.

## Files

- `src/thread/engineWorker.ts`
- `src/thread/input.ts`
- `src/thread/resize.ts`
- `renderTarget.ts`
- `vite.lib.config.ts`
- `scripts/checkBundle.mjs`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
