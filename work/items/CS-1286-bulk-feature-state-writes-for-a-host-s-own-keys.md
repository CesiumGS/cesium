---
id: CS-1286
title: Bulk feature-state writes for a host's own keys, about a million at a time, with no loop per key
kind: work
state: proposed
created: 2026-11-24
project: CS-196
---

> **Proposal.** Source: a host application's interaction design, relayed on 2026-11-24. The host is moving to one content-neutral interaction model: every content in a view is a source with declared capabilities, any feature is addressable as (content name, key), and one locate pipeline serves every tool. Related, already filed: CS-813 (render products), CS-338 (per-element overrides), CS-1116 (feature mask) and CS-669 (drill picks). Why now: a host keys features by its own IDs, and writing state per key in a script loop doesn't scale to a million features. Size: medium. Decider: owner. Filed 2026-11-24.

## Done when

- Feature state can be written in bulk for a host's own keys: a `setByKey` that takes arrays of keys and values, or a bulk key-to-ID call followed by a bulk write.
- About a million keys are written with no script loop per key. Measured in Dyno, with a run ID cited.
- Unknown keys are reported, not dropped silently.
- It fits CS-338's per-element overrides and CS-1108's per-feature state.
