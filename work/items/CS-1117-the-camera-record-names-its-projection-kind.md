---
id: CS-1117
title: The camera record carries a general projective transform, and the engine derives level of detail, culling, picking and depth from it
kind: work
state: planned
created: 2026-11-23
project: CS-191
needs: [CS-1122]
---

> **Committed by the owner (2026-11-23), through CS-1122 A, for alpha.1.** It replaces CS-1111's projection kind. Generic: a host's orthographic CAD views, off-axis views and tiled captures are all one projective matrix.

## Done when

- The public camera record carries a 4×4 projective transform with explicit near and far planes, and no projection kind.
- Constructors make it from pinhole intrinsics (CS-814's), from orthographic extents, and from an off-axis frustum.
- Every engine use derives what it needs from the matrix, with no branch on a kind: screen-space error for level of detail, frustum culling, pick rays and depth linearization. Tests cover a perspective, an orthographic and an off-axis matrix.
- The orthographic camera (CS-218) is built on it for alpha.1.
