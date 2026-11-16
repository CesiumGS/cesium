---
id: CS-89
title: Dedicated worker groups onto `Jobs`
kind: work
state: planned
created: 2026-11-13
project: CS-12
needs: [CS-86]
touches: [packages/next/src/io/moonMapLoad.ts, packages/next/src/scene/slang.ts, packages/next/src/brep/kernelClient.ts, packages/next/src/brep/sectionClient.ts, packages/next/src/io/Jobs.ts]
---

Dedicated worker groups onto `Jobs`, including the app worker group. Needs nothing beyond the first slice (CS-86).

## Done when

- The Moon map, Slang, B-rep kernel and B-rep section workers are scheduled as dedicated groups in `Jobs`.
- `Jobs` has an app worker group.
