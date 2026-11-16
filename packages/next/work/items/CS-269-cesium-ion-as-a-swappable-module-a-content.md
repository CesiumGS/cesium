---
id: CS-269
title: "Cesium ion as a swappable module: a content-source interface and `@cesium/next/ion`"
kind: work
state: planned
created: 2026-11-13
project: CS-191
needs: [CS-552]
---

## Done when

Core imports nothing ion-specific (the import-boundary test enforces it), the ion implementation, Bing lookup and Moon loading live in `@cesium/next/ion`, the Viewer still gets ion defaults on demand, and a second implementation fits the interface unchanged.

Detail: `docs/design/ion-as-a-module.md`, "Decided to plan".
