---
id: CS-110
title: The worker backend (canvas transfer, resize, input, built-in controllers)
kind: work
state: planned
created: 2026-11-13
project: CS-13
needs: [CS-109]
touches: [packages/next/src/thread/engineWorker.ts, packages/next/src/thread/input.ts, packages/next/src/thread/resize.ts, packages/next/src/scene/renderTarget.ts, packages/next/vite.lib.config.ts, packages/next/scripts/checkBundle.mjs]
---

The worker backend (canvas transfer, resize, input, built-in controllers).

## Done when

- A scene keeps rendering in a worker, through the façade, while the page is blocked for 3 s.
- The `worker` browser suite renders the same images in both modes on its three pages.
- `checkBundle` shows the worker chunk, separate from the main chunk.

## Plan

`docs/superpowers/plans/2026-11-13-worker-facade.md`, its milestone table.
