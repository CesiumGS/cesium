---
id: CS-842
title: "D2: how does the globe fit, as content placed as an item or a special object?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T05:07:00.151Z
answered_via: question-tool
answered_by: owner
---

## Question

How does the globe fit (CS-454)? Today `Globe extends Tileset3D`.

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. Content placed as an item: one terrain source and ordered imagery layers, placed per body. `Globe` stops extending `Tileset3D`. (cost: the riskiest move in CS-555.)
- B. A special engine object that holds sources but isn't an item. (cost: two models of content.)
- C. Settle it only in CS-454, and keep `Globe` until then. (cost: holds CS-554 and CS-555.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A: the globe is content, one terrain source and ordered imagery layers, placed per body as an item.
