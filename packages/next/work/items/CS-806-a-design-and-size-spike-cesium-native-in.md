---
id: CS-806
title: "A design and size spike: Cesium Native in WebAssembly as an optional tiling-engine host behind the streaming-source seam"
kind: work
state: proposed
created: 2026-11-21
project: CS-191
needs: [CS-552]
touches: [packages/next/docs/design, packages/next/spikes]
---

The owner, 2026-11-22: 2.0 will likely pull in a Cesium Native WebAssembly wrapper, perhaps under a new name such as "tiling engine", from a separate repository and package. The owner chose to make it an optional host behind the streaming-source seam (CS-552), with today's TypeScript streaming as the default.

Nothing in the plan named Cesium Native until now. It brings its own selection, request scheduling, cache and ion client. Those duplicate what the TypeScript side has tuned: `BudgetedSelection`, `RequestScheduler`, eviction, LOD transitions, curvilinear maps, occlusion and `io/ion.ts`.

Source: the owner, through the chief of staff, from a review of 2.0's seams. Why now: the streaming-source seam's shape freezes at beta.1, and it has to admit an outside engine. Rough size: medium (a spike and a design note). Decider: the executor for the spike. Whether Cesium Native replaces anything, how it's versioned outside lockstep, and any new dependency all come back as decisions. Filed: 2026-11-22.

## Done when

- A design note in `docs/design/` gives the interface a worker-hosted outside engine implements: tree and selection, requests, and output through `DrawSink`. It also says what stays the core's: the shared budget, picks, heights and clamping.
- A spike measures what loading means for a WebAssembly build of Cesium Native: its size, its start time in a worker, and whether it needs threads. Threads mean `SharedArrayBuffer` and COOP/COEP headers. It also checks whether a strict CSP needs `wasm-unsafe-eval`. "Can't tell" is an acceptable answer where no build exists.
- The note says how `scripts/checkBundle.mjs` would keep it out of the main chunk, and how a package from another repository is pinned and hash-checked, the way PROJ's WebAssembly is.
- The streaming-source seam (CS-552) is checked to admit it, and any change it needs is written as a proposal before beta.1.
