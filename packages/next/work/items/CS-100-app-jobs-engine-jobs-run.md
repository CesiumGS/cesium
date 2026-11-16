---
id: CS-100
title: App jobs (`engine.jobs.run`)
kind: work
state: planned
created: 2026-11-13
project: CS-12
needs: [CS-89, CS-108]
touches: [packages/next/src/io/Jobs.ts, packages/next/src/scene/Engine.ts]
---

App jobs (`engine.jobs.run`). Needs CS-89 (the app worker group) and the one-API façade (CS-108). The owner's call after review: yes, narrowly, later, once the internal API has settled across the ports.

## Done when

- `engine.jobs.run(moduleUrl, …)` runs in the app group, below visible content by default, in both thread modes.
- A failing app job doesn't delay content.
