---
id: CS-1068
title: The USD subset reader is not ready for hostile files (a spike today)
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable security review (`fable-review-security.md`, finding 7), 2026-11-22. Severity: Important. Land before: the release that first ships the loader. Decider: owner.

## Done when

- a `need(n, width)` check before every allocation, a visited bitmap in the path tree, a namespace-depth cap and an ancestor-arc refusal in `composePrim`, and a parser depth counter, as a "done when" of the item that promotes the reader.
- The finding's evidence in the review is rechecked first, since the code may have moved.
