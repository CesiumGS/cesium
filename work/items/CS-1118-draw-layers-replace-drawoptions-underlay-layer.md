---
id: CS-1118
title: "Draw layers replace DrawOptions.underlay: layer, depth mode and order, sharing names with render features' slots"
kind: work
state: planned
created: 2026-11-23
project: CS-191
needs: [CS-1110]
---

> **Committed by the owner (2026-11-23).** Source: the general-primitives review of a CAD or BIM host application's needs (2026-11-23), in the chief of staff's notes. Generic: a host application builds its own features on this primitive. Through CS-1110 A, before beta.1.

## Done when

- `DrawOptions` takes a layer, a depth mode (test, no test, write) and an order, and `underlay` is gone.
- Layer names are shared with CS-848's render-feature slots.
- A no-depth overlay and display priority are both expressible, with tests.
