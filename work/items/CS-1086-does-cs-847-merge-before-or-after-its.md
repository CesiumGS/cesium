---
id: CS-1086
title: Does CS-847 merge before or after its restructuring?
kind: decision
state: done
created: 2026-11-22
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T06:24:37.864Z
answered_via: question-tool
answered_by: owner
---

## Question

The architecture review of CS-847 recommends restructuring identity (named content, keyed state, three owners). Does CS-847 merge before or after?

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. After: the moves land on the branch, then one review against the invariants.
- B. Merge the current branch as experimental now, and restructure before alpha.1.

Recommended: A.

## Answer

Open.
