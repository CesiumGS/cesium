---
id: CS-1298
title: @cesium/measure's screen-space curve sampling and the Viewer's screen-space error probe go through the projection matrix
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1117]
---

> **Proposal.** Source: CS-1117's report (a general projective camera), relayed by orch-11's report audit (2026-11-24). Why now: both still compute screen-space size with a perspective formula, so they go wrong under an orthographic or off-axis view. Size: small. Decider: owner. Filed 2026-11-24.

## Done when

- `@cesium/measure`'s screen-space curve sampling takes its pixel size from the view's projection matrix.
- The Viewer's screen-space error probe does the same.
- Tests under an orthographic and an off-axis projection agree with a reference.
