---
id: CS-1042
title: Request windows, retries and bytes each have two owners
kind: work
state: proposed
created: 2026-11-22
project: CS-191
---

> **Proposal.** Source: the Fable seams review (`fable-review-seams.md`, finding 6), 2026-11-22. Severity: Important. Land before: alpha.1 if any source ships through the seam before CS-554; otherwise with CS-554. Decider: owner.

## Done when

- one owner per resource. The arbiter decides who goes; the `RequestScheduler` keeps the origin's window and retry budget, and `host.fetch` takes its slot. Say which bytes `Want.cost.bytes` counts (CPU, GPU or both), and have the sinks report what they hold.
- The finding's evidence in the review is rechecked first, since the code may have moved.
