---
id: CS-87
title: Content decode with priorities and cancellation, onto `Jobs`
kind: work
status: Planned
created: 2026-11-13
project: CS-12
needs: [CS-86]
---

Content decode onto `Jobs`, with priorities and cancellation. Needs nothing beyond the first slice (CS-86).

## Done when

- Content decode runs at its tile's request priority.
- A decode is cancelled when its tile is deselected or evicted.
- Decoded content prepares its uploads in the apply phase.

## Files

- `src/scene/engineContent.ts`
- `src/scene/engineScene.ts`
- `src/scene/Engine.ts`
- `src/tiles/`
