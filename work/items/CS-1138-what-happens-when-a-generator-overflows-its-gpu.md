---
id: CS-1138
title: What happens when a generator overflows its GPU buffer?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:27:06.826Z
answered_via: question-tool
answered_by: owner
---

## Question

Generated geometry stays on the GPU, so buffers are sized in advance. What happens on overflow?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The kernel counts what it dropped; the viewer reads the count later without stalling, reports it on Engine.errors, and grows the buffer or coarsens the generator next run; nothing writes past a buffer.
- B. Refuse the style by name.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
