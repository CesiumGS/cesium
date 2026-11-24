---
id: CS-1069
title: Mesh indices are never checked against the vertex count
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable security review (`fable-review-security.md`, finding 8), 2026-11-22. Severity: Minor. Land before: beta.1. **One-way door:** no. **CS items:** CS-602. Decider: owner.

## Done when

- one pass for the maximum index in the worker; fail the tile with a named error.
- The finding's evidence in the review is rechecked first, since the code may have moved.

Seen again in CS-969's security review, 2026-11-24.
