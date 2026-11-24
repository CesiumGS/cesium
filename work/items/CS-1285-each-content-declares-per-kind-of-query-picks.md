---
id: CS-1285
title: Each content declares, per kind of query (picks, rays, snaps), whether it answers
kind: work
state: proposed
created: 2026-11-24
project: CS-191
needs: [CS-848]
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host must never meet a silent refusal. CS-848's design declares picks, rays and shadows for render features, but not snaps, and not for every content. Size: small to medium. Decider: owner. Filed 2026-11-24.

## Done when

- Every content declares, per kind of query (picks, rays, snaps, and region reads once CS-813 has them), whether it answers, and with what accuracy.
- A host can read those declarations before it asks.
- A query that a content doesn't answer returns an explicit refusal naming the content and the reason, never an empty result.
- Tests cover one content that answers and one that refuses each kind.
