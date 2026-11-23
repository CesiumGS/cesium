---
id: CS-1135
title: What do WebGL 2 viewers do with GPU-side generators?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:22:36.512Z
answered_via: question-tool
answered_by: owner
---

## Question

The WebGL 2 backend has no compute shaders. What about generators that run on the GPU under WebGPU?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Every generator has a CPU form in the runtime, run as jobs, with its output uploaded once.
- B. WebGL 2 viewers refuse such styles by name.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
