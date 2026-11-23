---
id: CS-1116
title: A feature mask that post stages read, with one reference outline stage outside core
kind: work
state: planned
created: 2026-11-23
project: CS-191
needs: [CS-1109]
---

> **Committed by the owner (2026-11-23).** Source: the general-primitives review of a CAD or BIM host application's needs (2026-11-23), in the chief of staff's notes. Generic: a host application builds its own features on this primitive. Through CS-1109 A.

## Done when

- A view can mark a set of features by stable ID into a mask that post stages read, per tick.
- One reference outline stage, with visible and hidden styles, lives in `@cesium/ui` or the examples, built only on the public mask.
- Hilite, emphasis and flash are not engine features.
