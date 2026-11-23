---
id: CS-1085
title: Who holds a feed change for a feature that isn't loaded?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T06:24:02.793Z
answered_via: question-tool
answered_by: owner
---

## Question

From the architecture review of CS-847: who holds a feed change (a peer's committed change) for a feature that isn't loaded?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Nobody: the feed updates loaded rows; the source's next load brings committed state, and a source must serve content at or past what it pushed.
- B. The engine, as an overlay with a cap, as built.
- C. The engine, only while a request that began before the push is in flight.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
