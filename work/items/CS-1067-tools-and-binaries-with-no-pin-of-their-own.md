---
id: CS-1067
title: Tools and binaries with no pin of their own
kind: work
state: proposed
created: 2026-11-22
project: CS-609
---

> **Proposal.** Source: the Fable security review (`fable-review-security.md`, finding 6), 2026-11-22. Severity: Minor. Land before: beta.1; the Basis record with CS-811. Decider: owner.

## Done when

- pin slangc's SHA-256 per platform in the repository and fail without a match; record the Basis commit and the file hashes in NOTICE with a test that checks them; add `.npmrc` with `ignore-scripts=true` and run the few needed scripts by name.
- The finding's evidence in the review is rechecked first, since the code may have moved.
