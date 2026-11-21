---
id: CS-430
title: "The WebGPU seams audited: each seam, its bypass test, and the seams still missing"
kind: work
state: in-progress
created: 2026-11-14
project: CS-437
claimed_by: orch-11-CS-430
---

## Done when

A list for the owner, made for the first public API review: every seam for later WebGPU features (the bindless pattern applied to rays and spatial queries, per-draw constants, draw arguments, geometry submission, bindless resources), each with its bypass test, and the seams still missing, each with what it would cost today. "Only where the seam costs nothing today; no design compromises in the current WebGPU path."

It reads the code and the seam tests (`test/seams.test.ts` and its neighbours); it changes nothing. The review (CS-102) takes its list.

Detail: `docs/superpowers/specs/2026-11-07-frames-5-earth-to-moon-design.md`, sections 7.10 and 15.2; `docs/design/bodies-frames-and-engineering-coordinates.md`, "groundwork for post-V1 WebGPU features".
