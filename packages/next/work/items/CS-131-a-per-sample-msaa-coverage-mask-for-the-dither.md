---
id: CS-131
title: A per-sample MSAA coverage mask for the dither
kind: work
state: proposed
created: 2026-11-13
project: CS-14
needs: [CS-129]
---

A per-sample coverage mask (four steps a pixel, `n_s = fract(n + s/4)`), as point sets already write their sample mask; it needs a sample-mask output in the depth prepass's fragment stage. Contingent on CS-129.

Detail: `docs/superpowers/plans/2026-11-13-lod-transitions.md`, its milestone table.
