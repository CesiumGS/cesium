---
id: CS-398
title: Recordings as runs
kind: work
state: planned
created: 2026-11-13
project: CS-389
needs: [CS-390]
---

The metadata endpoint and body (allowlisted parameters, no tokens, tested). "Save as run" and the reducer; `import-recording`. The recording page, with time series.

Coordinate with CS-152 (the recorder's network columns) and CS-116 (the recorder in worker mode), which touch the same files.

## Done when

A recording saved from the vertical-exaggeration example appears in Runs with its metadata and time series. A URL with an unknown or key-like parameter records without it (tested). The existing recorder tests pass. Owner review.

## Files

`scripts/vitePluginRecord.ts`, `widgets/recorder.ts`, `widgets/inspector.ts`, new `bench/suite/recording.mjs`, `views/Report.tsx` (or a new `Recording.tsx`), `cli.mjs`

Detail: `docs/superpowers/plans/2026-11-13-dyno-dev-harness.md`, its milestone table.
