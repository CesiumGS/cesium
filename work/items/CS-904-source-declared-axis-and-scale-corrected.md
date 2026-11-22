---
id: CS-904
title: Source-declared axis and scale, corrected through placement
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-835, CS-847]
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). alpha.1 reserves room for it.

It changes seam code in `src`, so it waits for CS-835's move and builds on CS-847's seam core. That keeps it from moving twice (chief of staff, 2026-11-22, reversible).

## Done when

- A content source can declare its up axis and its units (USD's `upAxis` and `metersPerUnit`), and placement corrects for them, under the package map's declared-placement contract.
- Tests cover a Z-up source in centimeters and a Y-up source in meters.
