---
id: CS-1052
title: The examples go around the package names, so they don't show what the API lacks
kind: work
state: proposed
created: 2026-11-22
project: CS-437
---

> **Proposal.** Source: the Fable api review (`fable-review-api.md`, finding F6), 2026-11-22. Severity: Important. Land before: alpha.1 for the rule; beta.1 for the 19 names. Decider: owner.

## Done when

- Add an import-boundary rule: an example imports a package by name only, with a short allowlist that is the recorded reach-past list. Then the 19 names are the review's promote-or-keep-out list (CS-433).
- The finding's evidence in the review is rechecked first, since the code may have moved.
