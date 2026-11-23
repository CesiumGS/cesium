---
id: CS-1045
title: Errors have three channels, and Engine.errors can't say which source failed
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable seams review (`fable-review-seams.md`, finding 10), 2026-11-22. Severity: Important. Land before: beta.1. Decider: owner.

## Done when

- before the API review, add kinds for sources (`"source"`, and one for requests and credentials), and give an error optional structured fields: the content's ID and the content key. Say in one place which failures go to `Engine.errors` and which come back to the caller.
- The finding's evidence in the review is rechecked first, since the code may have moved.
