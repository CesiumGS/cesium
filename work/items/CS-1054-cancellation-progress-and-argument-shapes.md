---
id: CS-1054
title: Cancellation, progress and argument shapes differ between like calls
kind: work
state: proposed
created: 2026-11-22
project: CS-437
---

> **Proposal.** Source: the Fable api review (`fable-review-api.md`, finding F9), 2026-11-22. Severity: Important. Land before: beta.1. Decider: owner.

## Done when

- CS-432 runs as a table: every public function that returns a promise, with its signal, progress, options type and failure. Fix by rule.
- The finding's evidence in the review is rechecked first, since the code may have moved.
