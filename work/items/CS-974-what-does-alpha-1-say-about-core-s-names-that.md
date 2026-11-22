---
id: CS-974
title: What does alpha.1 say about core's names that the package map moves elsewhere?
kind: decision
state: done
created: 2026-11-22
project: CS-437
decider: owner
answer: C
answered_at: 2026-11-22T20:59:17.376Z
answered_via: question-tool
answered_by: owner
---

## Question

Core's entry still publishes adapters (ion, Bing, 3D Tiles, glTF) and engine internals that the package map moves to other packages. What does alpha.1 say about them?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Publish as they are, with a release note listing what moves.
- B. Tag them @experimental in place until they move.
- C. Hold alpha.1 until the adapters have moved.

Recommended: B.

## Answer

Open.
