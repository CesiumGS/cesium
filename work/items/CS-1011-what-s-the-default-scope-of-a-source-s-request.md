---
id: CS-1011
title: What's the default scope of a source's request headers?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T03:48:08.736Z
answered_via: question-tool
answered_by: owner
---

## Question

A source's headers go to every origin its content names, as in 1.x. What's the default scope?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The source's own origin only; the host lists others.
- B. Every origin, as today and as 1.x.

Recommended: A.

## Answer

Open.
