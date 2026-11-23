---
id: CS-1070
title: Tileset and terrain structure is trusted on the main thread
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable security review (`fable-review-security.md`, finding 9), 2026-11-22. Severity: Minor. Land before: beta.1. **One-way door:** no. **CS items:** CS-272, CS-602. Decider: owner.

## Done when

- an explicit stack and a depth cap in the tile tree; refuse an external tileset whose canonical URL is one of its ancestors'; check `available` is an array of arrays of four integers in the worker.
- The finding's evidence in the review is rechecked first, since the code may have moved.
