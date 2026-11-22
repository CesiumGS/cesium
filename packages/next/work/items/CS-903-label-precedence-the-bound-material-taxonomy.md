---
id: CS-903
title: "Label precedence: the bound material, taxonomy aliases and GeomSubset IDs"
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-835, CS-847]
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). alpha.1 reserves room for it.

It changes seam code in `src`, so it waits for CS-835's move and builds on CS-847's seam core. That keeps it from moving twice (chief of staff, 2026-11-22, reversible).

## Done when

- The semantic label path (CS-832's design) adds the bound material as a precedence level, taxonomy aliases, and GeomSubset IDs.
- It reads both SemanticsLabelsAPI and Isaac's older SemanticsAPI, which one of the six samples still uses.
- Tests cover a label on a Material prim and a label on a GeomSubset.
