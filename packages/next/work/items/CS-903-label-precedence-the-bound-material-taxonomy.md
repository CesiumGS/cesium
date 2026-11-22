---
id: CS-903
title: "Label precedence: the bound material, taxonomy aliases and GeomSubset IDs"
kind: work
state: planned
created: 2026-11-22
project: CS-191
---

> **Committed by the owner (2026-11-22)**, through CS-802's answer B. Source: `docs/design/simready-and-usd.md` (CS-833). alpha.1 reserves room for it.

## Done when

- The semantic label path (CS-832's design) adds the bound material as a precedence level, taxonomy aliases, and GeomSubset IDs.
- It reads both SemanticsLabelsAPI and Isaac's older SemanticsAPI, which one of the six samples still uses.
- Tests cover a label on a Material prim and a label on a GeomSubset.
