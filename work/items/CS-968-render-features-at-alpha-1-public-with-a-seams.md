---
id: CS-968
title: "Render features at alpha.1: public with a seams-only context, the 0.x line, or raw device access?"
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-22T20:43:53.154Z
answered_via: question-tool
answered_by: owner
---

## Question

A public render-feature contract (public from alpha.1 by CS-841) would sit outside the GPU seams' bypass tests, unless its context reaches the GPU only through the seams.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Public, with a context that reaches the GPU only through the seams.
- B. On the 0.x line until three first-party features use it.
- C. Public with raw device access.

Recommended: A.

## Answer

Open.
