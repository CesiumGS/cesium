---
id: CS-738
title: Trends, charts, baselines and alerts keep devices apart
kind: work
state: planned
created: 2026-11-19
project: CS-389
needs: [CS-733, CS-734]
touches: [packages/next/bench/suite/data.ts, packages/next/bench/suite/views/trendsModel.ts, packages/next/bench/suite/views/Trends.tsx, packages/next/bench/suite/views/Compare.tsx, packages/next/bench/suite/views/Scenes.tsx, packages/next/bench/suite/views/Runs.tsx, packages/next/bench/suite/views/Alerts.tsx, packages/next/bench/suite/views/Overview.tsx, packages/next/bench/suite/views/Machines.tsx, packages/next/bench/suite/changepoints.mjs, packages/next/bench/suite/annotations.json, packages/next/bench/suite/DESIGN.md, packages/next/handbook/vite.config.ts, packages/next/test/bench*.test.ts]
---

From CS-717's design, filed by the main session on 2026-11-19 for milestone CS-722 (the owner: take the design's output and make an alpha milestone). The design is `docs/design/benchmark-devices-and-sharing.md` (CS-717), section 8. Rough size: large.

Model: the most capable one for design-heavy parts, a fast one for the rest.

## Done when

- On a three-device fixture store, Trends draws a series per device and configuration family, marks version and hardware changes, and hides runs that fail the timing health bar by default.
- Trends, Compare, Scenes and the run list facet by device, hardware class and configuration, and Compare refuses a timing verdict across devices.
- Control bands, change points and alerts run per series. One commit range that moves two devices groups into one alert naming both (tested).
- Overview says "on all N devices" or "Mixed: …" and never averages across devices. Machines becomes Devices. The handbook build refuses a device ID, a hardware object or a configuration (tested).
- The owner reviews it by clicking around.
