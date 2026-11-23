---
id: CS-1051
title: Public signatures name types the entries don't export, and nothing checks for it
kind: work
state: proposed
created: 2026-11-22
project: CS-437
---

> **Proposal.** Source: the Fable api review (`fable-review-api.md`, finding F5), 2026-11-22. Severity: Important. Land before: alpha.1 for the check; the names with the review. Decider: owner.

## Done when

- Add a forgotten-export check to `scripts/surfaceMap.mjs` (API Extractor calls it `ae-forgotten-export`): every type a public signature names is exported or the check fails by name. Give inline option types names.
- The finding's evidence in the review is rechecked first, since the code may have moved.
