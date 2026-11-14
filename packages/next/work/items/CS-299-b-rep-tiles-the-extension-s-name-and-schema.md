---
id: CS-299
title: "B-rep tiles: the extension's name and schema, NURBS or Bézier storage, and the USD input path?"
kind: decision
status: Planned
created: 2026-11-13
project: CS-193
decided-by: owner
---

## Question

From the note's "Open" list. Source: `docs/design/breps-and-geometry-queries.md`.

## Options and recommendation

- **The extension:** its name (`BENTLEY_brep` today, a draft) and a schema review.
- **Storage:** NURBS in tiles, or pre-split Bézier patches (size against loader work).
- **USD input:** how to read USD BRep without building OpenUSD to WebAssembly, which the note judges large and risky (inferred, not tried).

The note makes no recommendation.

## Answer

Open.
