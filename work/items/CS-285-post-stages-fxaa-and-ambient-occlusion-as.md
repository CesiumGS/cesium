---
id: CS-285
title: "Post stages: FXAA and ambient occlusion as stages, and a slot before the opaque pass"
kind: work
state: proposed
created: 2026-11-13
project: CS-192
---

**Proposal** (CS-686). Source: later, a copy of the follow-up list in `docs/design/custom-post-processing.md`, "First interface built", made by the 2026-11-13 plan migration. Why now: Nothing committed needs it; no release on the ladder names it. Rough size: medium, a few related changes. Decider: the owner. Filed: 2026-11-13.

## Done when

FXAA moves onto the post-stage interface (the sky plan's skipped Task 18) and ambient occlusion becomes a stage once a second stage needs a `beforeOpaque` slot with declared inputs.

Detail: `docs/design/custom-post-processing.md`, "First interface built".
