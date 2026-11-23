---
id: CS-1101
title: What may a declared content name look like, and what leaves the engine?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T21:07:24.007Z
answered_via: question-tool
answered_by: owner
---

## Question

Second architecture review of CS-847, Q2.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Text in a grammar no URL satisfies; change sets carry it; the engine's own messages never print it.
- B. Only the name's digest leaves the engine.
- C. Free text, checked against the asset's own URL parts.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
