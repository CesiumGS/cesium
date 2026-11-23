---
id: CS-1103
title: Does CS-847's tightening land before it merges?
kind: decision
state: done
created: 2026-11-23
project: CS-191
decider: owner
answer: A
answered_at: 2026-11-23T21:08:46.528Z
answered_via: question-tool
answered_by: owner
---

## Question

Second architecture review of CS-847, Q4: four rules (a push is applied or invalidates; an undeclared name digests everything but the credential; a name has one maker and a grammar no URL fits; outside-keyed records go through one own-property helper), mostly deletion, with five oracle-based tests.

From the Fable reviews of 2026-11-22, in the shared notes folder.

## Options and recommendation

- A. One round on the branch, then one review that attacks the oracles, then the merge decision.
- B. Merge as experimental now, and file the rest before alpha.1.

Recommended: A.

## Answer

Open.
