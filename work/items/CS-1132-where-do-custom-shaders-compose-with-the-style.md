---
id: CS-1132
title: Where do custom shaders compose with the style stage?
kind: decision
state: done
created: 2026-11-23
project: CS-10
decider: owner
answer: A
answered_at: 2026-11-23T23:12:54.333Z
answered_via: question-tool
answered_by: owner
---

## Question

Where do custom shaders compose with the generated style stage?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. After it: custom shaders read the style's outputs and may override them.
- B. Before it: the style reads values a custom shader produced.
- C. Both hooks.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
