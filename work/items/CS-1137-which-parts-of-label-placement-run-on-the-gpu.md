---
id: CS-1137
title: Which parts of label placement run on the GPU?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:26:48.847Z
answered_via: question-tool
answered_by: owner
---

## Question

A job's result applies at the end of a tick, so CPU label collision trails the camera by at least a tick.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Text shaping and candidate positions on the CPU; per-tick collision and fading as a GPU kernel; WebGL 2 uses the CPU form.
- B. All on the CPU, one tick behind.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
