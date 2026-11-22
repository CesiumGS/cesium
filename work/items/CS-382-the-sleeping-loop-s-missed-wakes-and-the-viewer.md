---
id: CS-382
title: The sleeping loop's missed wakes, and the Viewer's clock listener
kind: work
state: planned
created: 2026-11-13
project: CS-15
---

## Done when

The loop wakes on `PointCuller`'s pipelines and Safari's pixel-ratio changes, the translucency example's sync loops let it sleep, and the Viewer removes its clock listener on destroy.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 4b".
