---
id: CS-1100
title: What does content with no declared name digest? (revisits CS-1080)
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T21:06:56.685Z
answered_via: question-tool
answered_by: owner
---

## Question

From the second architecture review of CS-847 (fable-cs847-architecture-2.md): CS-1080's credential list now makes ?key=roads and ?key=rivers merge, and its premise (IDs saved across runs) was overtaken by CS-1088. What does content with no declared name digest?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. Everything its kind receives except the declared credential (kind, URL, whole query, options), with no credential list: it can split content, never merge it.
- B. CS-1080 A as answered, with the options and the kind folded in.
- C. No derived name: an undeclared open gets a name for the session only.

Recommended: A.

## Answer

Recorded in the front matter (`answer:`, `answered_by`, `answered_at`).
