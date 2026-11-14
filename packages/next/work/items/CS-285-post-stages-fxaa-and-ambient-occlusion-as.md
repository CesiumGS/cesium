---
id: CS-285
title: "Post stages: FXAA and ambient occlusion as stages, and a slot before the opaque pass"
kind: work
status: Proposed
created: 2026-11-13
project: CS-192
---

## Done when

FXAA moves onto the post-stage interface (the sky plan's skipped Task 18) and ambient occlusion becomes a stage once a second stage needs a `beforeOpaque` slot with declared inputs.

Detail: `docs/design/custom-post-processing.md`, "First interface built".
