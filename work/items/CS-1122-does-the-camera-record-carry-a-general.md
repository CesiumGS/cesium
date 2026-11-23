---
id: CS-1122
title: Does the camera record carry a general projective transform, with physical cameras as an optional ray model?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T22:50:59.238Z
answered_via: question-tool
answered_by: owner
---

## Question

Is a binary projection kind (pinhole or orthographic) the right generalization? The owner asked about physical cameras with a sensor of real area, as a path tracer uses, and whether a taxonomy can be avoided.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The record carries a general projective transform, with constructors for pinhole intrinsics and orthographic extents; the engine derives level of detail, culling, picking and depth from the matrix. Physical camera models are an optional ray model that only ray-traced products use.
- B. The matrix only; no ray model in 2.0.
- C. Keep the projection kind (CS-1111).

Recommended: A.

## Answer

Open.
