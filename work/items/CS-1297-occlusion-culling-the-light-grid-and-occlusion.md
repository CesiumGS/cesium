---
id: CS-1297
title: Occlusion culling, the light grid and occlusion feedback for views whose rays don't meet at one eye point
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-1117]
---

> **Proposal.** Source: CS-1117's report (a general projective camera), relayed by orch-11's report audit (2026-11-24). Why now: CS-1117 derives level of detail, culling, picking and depth from the matrix, but occlusion culling, the light grid and occlusion feedback still assume rays that meet at one eye point; CS-218 would ship an orthographic view on top of them. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Occlusion culling, the light grid and occlusion feedback work for views whose rays don't meet at one eye point, derived from the projection matrix with no branch on a projection kind.
- Tests with an orthographic and an off-axis projection show the same culled set and the same lighting as a reference.
- CS-218 (the orthographic camera) can ship on them.
