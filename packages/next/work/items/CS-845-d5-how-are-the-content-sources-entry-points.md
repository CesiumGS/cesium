---
id: CS-845
title: "D5: how are the content sources' entry points grouped and named?"
kind: decision
state: done
created: 2026-11-21
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T05:09:21.455Z
answered_via: question-tool
answered_by: owner
---

## Question

How are the content sources' entry points grouped and named?

From CS-552's design (`docs/design/content-source-seam.md`, "Decisions for the owner"), asked by the chief of staff on 2026-11-21.

## Options and recommendation

- A. One package per family of sources (tiles, globe, glTF, MVT, Esri, USD, ion), named by CS-834's package map with seam prefixes. (cost: names wait for CS-834.)
- B. One entry point for every source. (cost: no tree-shaking by family.)

Recommended: A, the design's recommendation.

## Answer

The owner, 2026-11-21: A: one package per family of sources, named by CS-834's package map with seam prefixes.
