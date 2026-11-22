---
id: CS-906
title: Variant selections and payload policy as open options, and their change as invalidation
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-835, CS-847]
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). alpha.1 reserves room for it.

It changes seam code in `src`, so it waits for CS-835's move and builds on CS-847's seam core. That keeps it from moving twice (chief of staff, 2026-11-22, reversible).

## Done when

- Variant selections and the payload policy are open options of a USD source.
- A change to either invalidates exactly the content it affects.
- Per-instance IDs survive the change.
