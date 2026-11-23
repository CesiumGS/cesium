---
id: CS-1131
title: "Is the styling runtime's boundary: it plans and compiles, the viewer executes?"
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:12:30.266Z
answered_via: question-tool
answered_by: owner
---

## Question

Should the shared styling runtime own GPU work, or plan and compile while each viewer executes on its own job system and device?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. It plans and compiles: CPU work as jobs on the viewer's job system; GPU work as IR compute kernels with declared buffers that the viewer compiles and schedules; outputs stay in viewer-owned GPU buffers in a fixed layout feeding indirect draws through the draw-arguments seam; a style's GPU-rate parts are IR the viewer compiles into a style stage, under the viewer's GPU-safety checks. The runtime crate may ship a reference IR-to-shader compiler.
- B. The runtime gets the viewer's device and records its own passes.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
