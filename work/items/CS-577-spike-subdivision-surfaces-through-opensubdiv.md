---
id: CS-577
title: "Spike: subdivision surfaces through OpenSubdiv in WebAssembly or a TypeScript patch conversion, measured"
kind: work
state: planned
created: 2026-11-17
project: CS-193
needs: [CS-300]
touches: [packages/next/spikes/**]
tier_override: 3
---

The owner answered CS-300 on 2026-11-18: spike it first, "to understand performance tradeoffs". Subdivision surfaces are planned as another representation for the query interface (`docs/design/breps-and-geometry-queries.md`, "Subdivision surfaces"), through OpenSubdiv built for WebAssembly or a TypeScript conversion to patches for the GPU path.

It's a decision tool (the project's rule for spikes): the spike page or report states the data used, the settings, the costs measured, the A/B comparison, and the decision it puts to the owner, not just controls.

## Done when

- Both routes are measured on the same subdivision models: conversion time, patch counts, memory, the GPU path's draw cost, and download size (OpenSubdiv's WebAssembly against the TypeScript code), with run IDs and the machine.
- Accuracy against a reference limit surface is stated for each, as far as the inputs support.
- A decision item is filed for the owner with the options, the measurements and a recommendation, and CS-312 follows its answer.
