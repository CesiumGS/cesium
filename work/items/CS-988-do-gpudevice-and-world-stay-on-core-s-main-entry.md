---
id: CS-988
title: Do GpuDevice and World stay on core's main entry?
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: B
answered_at: 2026-11-22T21:12:21.944Z
answered_via: question-tool
answered_by: owner
---

## Question

The design notes left GpuDevice's and World's place for the API review. Do they stay on core's main entry?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Both stay, with GPU members tagged @internal.
- B. World stays; GpuDevice and the GPU-typed names move to a main-thread-only entry (CS-107) that a device-sharing host imports by name.
- C. Both leave the main entry.

Recommended: B.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
