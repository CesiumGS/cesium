---
id: CS-1136
title: How does Cesium IR grow for the styling runtime?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:26:34.030Z
answered_via: question-tool
answered_by: owner
---

## Question

The runtime needs kernels with declared buffers, generator calls, an item rate, strings and bounded loops. Which become IR ops, and which a plan format around it?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The IR stays pure, total and metered, gaining strings, an item rate and bounded loops; a separate, versioned plan format describes execution as a typed graph of stages (inputs, outputs, buffers, budgets) referencing IR functions, with styling as its first user.
- B. The same split, with a styling-only plan format.
- C. One format.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
