---
id: CS-445
title: "The example runner's loose ends: the search-parameter rollback, and dispose after viewer.destroy"
kind: work
state: planned
created: 2026-11-14
project: CS-199
---

## Done when

A rollback of the search params between two quick `setParams` calls (`searchKey` and `store.sync`) is verified or fixed, and a run left mid-way no longer calls `dispose` after `viewer.destroy` and `resumePresentation`.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, the frames example's list ("Dyno: the example runner's loose ends").
