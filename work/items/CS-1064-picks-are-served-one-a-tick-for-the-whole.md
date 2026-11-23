---
id: CS-1064
title: Picks are served one a tick for the whole engine, from unbounded queues
kind: work
state: proposed
created: 2026-11-22
project: CS-195
---

> **Proposal.** Source: the Fable performance review (`fable-review-performance.md`, finding F9), 2026-11-22. Severity: Minor. Land before: beta.1 for the semantics; 2.0.0 for the slots. Decider: owner.

## Done when

- Give each view its own params and result slot so every view can answer once a tick, and add a "latest wins" option so a superseded hover pick resolves `undefined` at once. Decide before beta.1 whether superseded picks may resolve early, since that is promise behavior hosts will rely on.
- The finding's evidence in the review is rechecked first, since the code may have moved.
