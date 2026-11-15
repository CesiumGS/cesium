---
id: CS-510
title: Program-form warp fits run off the main thread
kind: work
status: Planned
created: 2026-11-15
project: CS-12
needs: [CS-91, CS-105]
---

Once warps can be passed as Cesium IR programs or modules (CS-105) and their fits run as progressive jobs (CS-91), a program-form warp's fits run on a worker rather than in a main-thread slice. Split on 2026-11-15 from CS-105's Done-when, so neither CS-91 nor CS-105 waits on the other.

## Done when

- For every program-form warp, `warpTick`'s fits run on a worker, and the main thread's slice of the apply phase holds no fit work for it.
- A closure warp still fits in a main-thread slice, and both forms give the same fitted result.

Detail: `docs/design/job-system.md`, the CS-91 entry.
