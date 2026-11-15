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

- A scene keeps rendering in a worker, through the façade, while the page is blocked for 3 s.
- The `worker` browser suite renders the same images in both modes on its three pages.
- `checkBundle` shows the worker chunk, separate from the main chunk.

## Files

- `src/thread/engineWorker.ts`
- `src/thread/input.ts`
- `src/thread/resize.ts`
- `renderTarget.ts`
- `vite.lib.config.ts`
- `scripts/checkBundle.mjs`

Detail: `docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
