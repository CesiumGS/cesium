---
id: CS-859
title: "The engine starts fast: pipelines compile in one round and optional subsystems load lazily"
kind: milestone
state: planned
created: 2026-11-21
project: CS-389
outcome: A default view starts without waiting on three compile rounds or loading optional subsystems it doesn't use, measured by Dyno's cold-start run.
constraints: [CS-764 c?, CS-765 c?]
---

## Done when

To shape: clauses (c1, c2…) and the independent check.

## Notes

From the owner's review of the Health view's exceptions, 2026-11-21: CS-764 and CS-765 are performance work for alpha.1, measured by Dyno (CS-856), with no merge gate. CS-794 (Cesium IR loads lazily) went to CS-417.
