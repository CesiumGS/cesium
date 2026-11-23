---
id: CS-264
title: "Overlay draw options: a no-depth-test flag, per-layer imagery saturation, tints above 1"
kind: work
state: planned
created: 2026-11-13
project: CS-190
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames example", made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. Rough size: small, about one reviewed change. Decider: the owner. Filed: 2026-11-13.

## Done when

A draw flag to skip the depth test (x-ray dashes), a per-layer imagery brightness and saturation control, and draw tints above 1 documented and tested as allowed.

Detail: `docs/design/bodies-frames-and-engineering-coordinates.md`, "Carried forward from the frames example".

## Note (2026-11-23)

Reshaped (2026-11-23): the no-depth flag becomes a draw layer (CS-1118, CS-1110 A). What stays here is transient batches for per-tick decorations, with their churn cost measured.
