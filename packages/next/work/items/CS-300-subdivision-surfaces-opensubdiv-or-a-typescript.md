---
id: CS-300
title: "Subdivision surfaces: OpenSubdiv, or a TypeScript patch conversion?"
kind: decision
status: Planned
created: 2026-11-13
project: CS-193
decided-by: owner
---

## Question

Subdivision surfaces are planned as another representation for the query interface (owner, 2026-11-10), not designed. Source: `docs/design/breps-and-geometry-queries.md`, "Subdivision surfaces".

## Options and recommendation

- **OpenSubdiv** built to WebAssembly.
- **A TypeScript conversion** to patches for step 5's GPU path.

The note makes no recommendation.

## Answer

Open.
