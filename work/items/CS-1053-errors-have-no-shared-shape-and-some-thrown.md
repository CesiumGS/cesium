---
id: CS-1053
title: Errors have no shared shape, and some thrown classes aren't exported
kind: work
state: proposed
created: 2026-11-22
project: CS-437
---

> **Proposal.** Source: the Fable api review (`fable-review-api.md`, finding F8), 2026-11-22. Severity: Important. Land before: `NoRendererError` before alpha.1; the rule before beta.1. Decider: owner.

## Done when

- The review sets one rule: which failures are typed, what a typed error carries (a stable `code`, and what to do), and that every class a public call can throw is exported. Export `NoRendererError` before alpha.1 either way.
- The finding's evidence in the review is rechecked first, since the code may have moved.
