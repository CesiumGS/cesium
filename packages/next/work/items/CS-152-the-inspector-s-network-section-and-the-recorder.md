---
id: CS-152
title: The inspector's Network section and the recorder
kind: work
state: planned
created: 2026-11-13
project: CS-16
needs: [CS-149, CS-150, CS-151]
touches: [packages/next/widgets/inspector.ts, packages/next/widgets/inspectable.ts, packages/next/widgets/engine.ts, packages/next/widgets/recorder.ts, packages/next/widgets/recorderRows.ts, packages/next/bench/suite]
---

The inspector's Network section and the recorder.

## Done when

- Per origin, the Network section shows the protocol, the request window, requests in flight, time to first byte at p50 and p95, and the derived timeouts.
- The section shows a state chip and counters by failure class.
- Each tileset's failed list has a Retry failed control.
- Failures and retries show on the shared time axis.
- The layout doesn't move between states: the DOM-skeleton test holds.
- The recorder has the columns `net_timeouts`, `net_retries`, `net_failed` and `net_paused`, and Dyno's report and diagnose scripts read them.

## Plan

`docs/superpowers/plans/2026-11-13-streaming-robustness.md`, its milestone table.
