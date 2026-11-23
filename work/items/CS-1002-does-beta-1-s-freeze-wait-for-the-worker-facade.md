---
id: CS-1002
title: Does beta.1's freeze wait for the worker façade and the Tile change?
kind: decision
state: done
created: 2026-11-22
project: CS-195
decider: owner
answer: A, else B
answered_at: 2026-11-23T03:40:28.189Z
answered_via: question-tool
answered_by: owner
---

## Question

Moving tile selection off the main thread needs the worker façade (CS-103 to CS-108) and a tile table a worker can read. Does beta.1's freeze wait for them?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Hold the freeze until CS-103 to CS-108 and the Tile change land.
- B. Freeze, with synchronous reads, closure options and Tile marked experimental.
- C. Freeze as is, and accept breaking changes in 2.x.

Recommended: A where the plan allows, else B.

## Answer

Open.
