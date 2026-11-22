---
id: CS-293
title: "Translucency pass costs: blended-draw rectangles, empty pixels, the frustum"
kind: work
state: proposed
created: 2026-11-13
project: CS-192
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 4b", made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

The translucency passes clip to the blended draws' screen rectangle, the exact-mode sort skips empty pixels, and `translucentRange` respects the frustum.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from frames plan 4b".
