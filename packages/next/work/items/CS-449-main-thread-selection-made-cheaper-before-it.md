---
id: CS-449
title: "Main-thread selection made cheaper before it moves: display and updateVisibility cut"
kind: work
status: Planned
created: 2026-11-14
project: CS-12
needs: [CS-96]
---

## Done when

Tile selection on the main thread is cheaper before it moves: `display` and `updateVisibility` are cut, guided by CS-96's fresh profile. Then traversal moves to a worker over the tile table (CS-98).

Detail: `docs/design/job-system.md`, next steps, item 2.
