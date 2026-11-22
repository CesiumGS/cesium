---
id: CS-435
title: The measurement module's seam and entry point
kind: work
state: planned
created: 2026-11-14
project: CS-437
needs: [CS-438]
---

## Done when

Measurement and tools have their own module's seam and entry point, open source in this repository: "the core provides picks, design coordinates, accuracy terms and the frame tree; the module provides the tools and their UI. A host application can use it or bring its own." Snapping keeps its client/server split. The tools and their UI are built on it afterwards (CS-243).

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, section 15.2; `docs/design/bodies-frames-and-engineering-coordinates.md`, "modules with interfaces".
