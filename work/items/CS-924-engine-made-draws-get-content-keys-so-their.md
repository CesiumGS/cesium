---
id: CS-924
title: Engine-made draws get content keys, so their stable IDs don't follow the order they were added
kind: work
state: proposed
created: 2026-11-22
project: CS-437
needs: [CS-815]
---

> **Proposal.** Source: CS-815's executor (2026-11-22). Why: CS-815 gives content stable IDs, but draws the engine makes itself are still numbered in the order they were added. Size: small. Decider: owner. Filed 2026-11-22.

## Done when

- Every draw the engine makes itself has a content key, so its stable ID doesn't depend on the order it was added.
- A test adds them in two orders and gets the same IDs.
