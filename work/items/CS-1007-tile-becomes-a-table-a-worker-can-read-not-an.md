---
id: CS-1007
title: Tile becomes a table a worker can read, not an exported object tree (CS-1002)
kind: work
state: planned
created: 2026-11-22
project: CS-195
needs: [CS-1002]
---

> **Committed by the owner (2026-11-22), through CS-1002: before beta.1's freeze if the plan allows, otherwise `Tile` ships experimental.** Source: the Fable performance review (`fable-review-performance.md`).

## Done when

- Tiles are held in a table that a worker can read and selection can run over off the main thread (CS-98). `Tile` is no longer an exported object tree, or it's marked experimental if the freeze comes first.
- `api/surface.txt` shows the change, and a test runs selection over the table in a worker.
