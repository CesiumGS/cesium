---
id: CS-1031
title: What does a feature ID derive from?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T04:12:02.991Z
answered_via: question-tool
answered_by: owner
---

## Question

A feature ID includes the content's ID (its open order), so one tileset placed in two worlds gets two sets of feature IDs for the same features; a peer's change set carrying IDs is refused, and labels saved by feature ID don't carry across runs or worlds. What does a feature ID derive from?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The content's canonical source and the row's key only, the same across opens, worlds and runs.
- B. Keep the content ID in it.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
