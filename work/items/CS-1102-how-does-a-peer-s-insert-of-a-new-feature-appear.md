---
id: CS-1102
title: How does a peer's insert of a new feature appear?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T21:08:13.217Z
answered_via: question-tool
answered_by: owner
---

## Question

Second architecture review of CS-847, Q3: CS-1085 didn't say how a peer's insert appears.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. The engine drops it; the source invalidates the content that holds it, and the reload shows it.
- B. The push names the resident content it belongs to, and the row joins that batch.
- C. As built, with eviction added.

Recommended: A.

## Answer

Open.
