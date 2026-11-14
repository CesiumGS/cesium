---
id: CS-293
title: "Translucency pass costs: blended-draw rectangles, empty pixels, the frustum"
kind: work
status: Proposed
created: 2026-11-13
project: CS-192
---

## Done when

The translucency passes clip to the blended draws' screen rectangle, the exact-mode sort skips empty pixels, and `translucentRange` respects the frustum.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 4b".
