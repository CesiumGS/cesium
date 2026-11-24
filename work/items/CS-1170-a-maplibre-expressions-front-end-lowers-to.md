---
id: CS-1170
title: A MapLibre expressions front end lowers to Cesium IR
kind: work
state: planned
created: 2026-11-23
project: CS-190
needs: [CS-1169]
---

The owner's CS-1169 A: MapLibre style expressions are an experimental front end that lowers to Cesium IR, alongside MVT vector tiles (CS-557). This item covers expressions only. Whole style documents are CS-1171.

## Done when

- MapLibre style expressions (spec v8) over feature properties, zoom and feature state parse and lower to the IR, as a front-end module of their own, loaded on demand like the 1.x front end.
- The expressions it accepts are listed. The rest are refused at parse time with a message naming the expression, never dropped silently.
- It needs nothing new in the IR. If an expression does need something, that comes back as a question rather than an IR change.
- Tests run each accepted expression against a reference result on fixture features, with no outside service.
- It is marked experimental, with the experimental line's version semantics.
