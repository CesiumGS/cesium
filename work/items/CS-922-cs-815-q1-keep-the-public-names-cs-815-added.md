---
id: CS-922
title: "CS-815 Q1: keep the public names CS-815 added beyond CS-832's checklist?"
kind: decision
state: planned
created: 2026-11-22
project: CS-437
decider: owner
---

## Question

CS-815 added public names beyond CS-832's checklist. Keep them? They are `canonicalSource`, `stableIdOf`, `DEFAULT_TAXONOMY`, `PickResult.key`, `scope` and `draw`, the identity options, and `cameraRecord` renamed to `camera`.

From CS-815's executor (2026-11-22). CS-815's merge waits on this, because it changes `api/surface.txt` and `packages/core/src/index.ts`.

## Options and recommendation

- A. Keep them, and mark `World.feature` `@internal` in CS-847.
- B. Keep only the checklist's names; the rest become internal before CS-815 merges. (Cost: a fix round on CS-815.)

Recommended: A.

## Answer

Open.
