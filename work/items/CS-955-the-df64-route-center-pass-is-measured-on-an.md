---
id: CS-955
title: The df64 route-center pass is measured on an Apple GPU, with a CPU fallback where a self-test fails
kind: work
state: planned
created: 2026-11-22
project: CS-10
---

> **Committed by the owner (2026-11-22), through CS-954's answer A, for alpha.1.** Source: the Fable accuracy review (`fable-review-accuracy.md`, finding F1).

## Done when

- The GPU pass that remakes a compiled route's center constants (`packages/core/src/scene/world/routes.ts`, for a route with a dynamic parameter and 16 or more draws) is read back on the GPU and compared with the CPU path. The comparison is made on an Apple GPU and on at least one other vendor where available, with the eye away from the draw's center. The error is stated in meters at the Earth's surface.
- A self-test runs the pass once per device. Where its error exceeds the route's stated bound, the engine uses the CPU path, and says so in the device report.
- A GPU test fails if the pass's error grows past the bound, and its `pass` field is read.
