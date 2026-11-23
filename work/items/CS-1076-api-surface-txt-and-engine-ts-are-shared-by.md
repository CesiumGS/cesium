---
id: CS-1076
title: api/surface.txt and Engine.ts are shared by many ready items
kind: work
state: proposed
created: 2026-11-22
project: CS-609
---

> **Proposal.** Source: the Fable alpha1-path review (`fable-review-alpha1-path.md`, finding 9), 2026-11-22. Severity: Minor. Land before: alpha.1. Decider: owner.

## Done when

- run at most one surface-changing item per batch beside others, merge the three small claimed ones (CS-939, CS-940, CS-943) first, and run CS-765 alone, as CS-835 was.
- The finding's evidence in the review is rechecked first, since the code may have moved.
