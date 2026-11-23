---
id: CS-1040
title: Wall-clock assertions in the unit suite fail under load and train reruns
kind: work
state: proposed
created: 2026-11-22
project: CS-199
---

> **Proposal.** Source: the Fable evidence review (`fable-review-evidence.md`, finding 14), 2026-11-22. Severity: Minor. Land before: beta.1. **Items:** CS-928, CS-948. Decider: owner.

## Done when

- Replace time limits with operation counts or complexity checks (calls made, nodes visited). Where time is the claim, measure it in Dyno.
- The finding's evidence in the review is rechecked first, since the code may have moved.
