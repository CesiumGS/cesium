---
id: CS-1043
title: A host's tile loader can't texture or place what it writes
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable seams review (`fable-review-seams.md`, finding 7), 2026-11-22. Severity: Important. Land before: beta.1; with CS-554 in practice. Decider: owner.

## Done when

- before CS-554 freezes "`DrawSink` as it is", add data-only material and texture descriptors (or a model upload that takes plain glTF-shaped data), a way to name a body's anchor, and placement on `World.add(content, ...)`. Split the `cannot-cross` members out of what sources see.
- The finding's evidence in the review is rechecked first, since the code may have moved.
