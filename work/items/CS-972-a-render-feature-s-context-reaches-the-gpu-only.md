---
id: CS-972
title: A render feature's context reaches the GPU only through the seams, under the seams' bypass tests (CS-968 A)
kind: work
state: planned
created: 2026-11-22
project: CS-191
needs: [CS-968]
---

> **Committed by the owner (2026-11-22), through CS-968 A, for alpha.1.** Source: the Fable seams review (`fable-review-seams.md`, finding 8).

## Done when

- A public render feature's context reaches the GPU only through the per-draw constants, draw arguments, geometry submission, bindless and ray-query seams. It gets no raw device.
- The seams' bypass tests cover render features registered from outside the engine, shown by a planted bypass.
