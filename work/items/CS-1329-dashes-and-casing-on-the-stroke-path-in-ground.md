---
id: CS-1329
title: Dashes and casing on the stroke path, in ground and pixel units
kind: work
state: proposed
created: 2026-11-24
project: CS-190
needs: [CS-261]
---

> **Proposal.** Source: CS-258's plan (`docs/superpowers/plans/2026-11-24-vector-drawing.md`, section 3.2, its item VS), on CS-258's branch until it merges; the design is `docs/design/vector-drawing.md`. Relayed by orch-11 on 2026-11-24. Why now: CS-261 draws solid strokes only; MapLibre's dash arrays and CAD line styles need dashes, and road styles need casing. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Ground dashes from the stored distance along the line plus the piece's phase.
- Pixel dashes from a prefix sum of projected segment lengths over every segment of a polyline, before compaction, clipped at the near plane, in the per-view cull, in a bounded number of workgroup passes that caps a record's segments at a constant (65,536 to start). The job splits a longer record, and the excess is counted on `Engine.errors`.
- A CPU twin checks a pattern's period on screen within half a pixel along a bending line, and that the phase holds as segments leave the view, across a piece boundary, and across a record boundary of one polyline.
- MapLibre's `line-dasharray` (multiples of the width) and `BENTLEY_materials_line_style`'s 16-bit pattern both map to pixel patterns, each with a test.
- Casing: a wider stroke under a stroke, from one record.
- The handbook's vector tab says what's built.
