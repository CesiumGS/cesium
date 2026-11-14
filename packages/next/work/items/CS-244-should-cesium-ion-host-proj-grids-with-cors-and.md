---
id: CS-244
title: Should Cesium ion host PROJ grids, with CORS and cropped tiles?
kind: decision
status: Planned
created: 2026-11-13
project: CS-189
decided-by: owner
---

## Question

PROJ-data serves no CORS headers, so grids are self-hosted today. The owner suggested ion as a host. Source: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Held for the owner, still open".

## Options and recommendation

- **Ion hosts the grids** (the owner's suggestion), possibly with cropped regional tiles.
- **Applications self-host,** as today.

The source recommends keeping the grid source a configurable base URL, which is built, so this is a hosting choice, not engine work.

## Answer

Open.
