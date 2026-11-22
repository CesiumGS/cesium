---
id: CS-559
title: USD loads through the content-source seam
kind: work
state: planned
created: 2026-11-16
project: CS-191
needs: [CS-552, CS-556, CS-843]
touches: [packages/next/src/**]
---


USD loads as a source through the seam. Related: CS-304 (`BrepSource.fromUsd`) and CS-305 (the B-rep tiler, USD to 3D Tiles 2.0), which cover USD's B-reps.

## Done when

- D3's spike (CS-843, A) is done, shared with CS-833's SimReady study, and its numbers recorded: size, start time in a worker, threads, and what a strict CSP needs. "Can't tell" is an acceptable answer where no build exists.
- A `usd` kind, a `whole` source on the runtime D3 chose. A fixture stage with a reference, a payload and a variant loads, and the payload loads only when it's in view.
- `UsdPreviewSurface` materials draw through the material system, point instancers through instancing, and `SemanticsLabelsAPI` labels reach picks (CS-815).
- Time samples play through the views' clock.
- A new dependency comes in only with the owner's yes.
